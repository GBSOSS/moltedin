/**
 * Twitter Verification Service for MoltedIn
 *
 * This service monitors Twitter for verification tweets and processes them.
 *
 * Tweet format expected:
 *   "I'm claiming @agent-name on @MoltedIn 🦞
 *    Verification: MOLT-XXXX
 *    #MoltedIn"
 */

import { TwitterApi } from 'twitter-api-v2';

// Twitter API client (initialized with credentials)
let twitterClient: TwitterApi | null = null;

// Initialize Twitter client
export function initTwitterClient() {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (apiKey && apiSecret && accessToken && accessSecret) {
    twitterClient = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessSecret,
    });
    console.log('Twitter client initialized with OAuth 1.0a');
  } else if (bearerToken) {
    twitterClient = new TwitterApi(bearerToken);
    console.log('Twitter client initialized with Bearer Token (read-only)');
  } else {
    console.warn('Twitter credentials not configured. Verification service disabled.');
  }

  return twitterClient;
}

// Parse verification tweet content
export function parseVerificationTweet(tweetText: string): {
  agentName: string | null;
  verificationCode: string | null;
} {
  // Pattern: "I'm claiming @agent-name on @MoltedIn"
  const agentPattern = /claiming\s+@([\w-]+)\s+on\s+@MoltedIn/i;
  const agentMatch = tweetText.match(agentPattern);

  // Pattern: "Verification: MOLT-XXXX"
  const codePattern = /Verification:\s*(MOLT-[\w]+)/i;
  const codeMatch = tweetText.match(codePattern);

  return {
    agentName: agentMatch ? agentMatch[1] : null,
    verificationCode: codeMatch ? codeMatch[1] : null,
  };
}

// Verify an agent using the parsed tweet data
export async function verifyAgentFromTweet(
  agentName: string,
  verificationCode: string,
  twitterUsername: string,
  tweetId: string,
  db: any // Database instance
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // 1. Find the agent
    const { data: agent, error: findError } = await db
      .from('agents')
      .select('*')
      .eq('name', agentName)
      .single();

    if (findError || !agent) {
      return { success: false, message: `Agent @${agentName} not found` };
    }

    // 2. Check if already verified
    if (agent.verified) {
      return { success: false, message: `Agent @${agentName} is already verified` };
    }

    // 3. Check verification code
    if (agent.verification_code !== verificationCode) {
      return { success: false, message: 'Invalid verification code' };
    }

    // 4. Update agent as verified
    const { error: updateError } = await db
      .from('agents')
      .update({
        verified: true,
        owner_twitter: twitterUsername,
        verified_at: new Date().toISOString(),
        verification_tweet_id: tweetId,
      })
      .eq('id', agent.id);

    if (updateError) {
      return { success: false, message: 'Failed to update verification status' };
    }

    return { success: true, message: `Agent @${agentName} has been verified!` };
  } catch (error) {
    console.error('Verification error:', error);
    return { success: false, message: 'Verification failed due to an error' };
  }
}

// Reply to a verification tweet
export async function replyToTweet(
  tweetId: string,
  message: string
): Promise<boolean> {
  if (!twitterClient) {
    console.warn('Twitter client not initialized, cannot reply');
    return false;
  }

  try {
    // Need read-write access for this
    const rwClient = twitterClient.readWrite;
    await rwClient.v2.reply(message, tweetId);
    return true;
  } catch (error) {
    console.error('Failed to reply to tweet:', error);
    return false;
  }
}

// Fetch recent mentions of @MoltedIn
export async function fetchMentions(
  sinceId?: string
): Promise<Array<{
  id: string;
  text: string;
  authorUsername: string;
  createdAt: string;
}>> {
  if (!twitterClient) {
    console.warn('Twitter client not initialized');
    return [];
  }

  try {
    // Get @MoltedIn user ID first
    const me = await twitterClient.v2.me();
    const userId = me.data.id;

    // Fetch mentions
    const mentions = await twitterClient.v2.userMentionTimeline(userId, {
      since_id: sinceId,
      max_results: 100,
      'tweet.fields': ['created_at', 'author_id'],
      expansions: ['author_id'],
    });

    const tweets: Array<{
      id: string;
      text: string;
      authorUsername: string;
      createdAt: string;
    }> = [];

    if (mentions.data?.data) {
      const users = new Map(
        mentions.includes?.users?.map(u => [u.id, u.username]) || []
      );

      for (const tweet of mentions.data.data) {
        tweets.push({
          id: tweet.id,
          text: tweet.text,
          authorUsername: users.get(tweet.author_id || '') || 'unknown',
          createdAt: tweet.created_at || new Date().toISOString(),
        });
      }
    }

    return tweets;
  } catch (error) {
    console.error('Failed to fetch mentions:', error);
    return [];
  }
}

// Main polling function - process new verification tweets
export async function processVerificationTweets(db: any): Promise<{
  processed: number;
  verified: number;
}> {
  // Get last processed tweet ID from database/cache
  const { data: config } = await db
    .from('config')
    .select('value')
    .eq('key', 'last_processed_tweet_id')
    .single();

  const sinceId = config?.value;

  // Fetch new mentions
  const mentions = await fetchMentions(sinceId);

  let processed = 0;
  let verified = 0;
  let lastTweetId = sinceId;

  for (const mention of mentions) {
    processed++;
    lastTweetId = mention.id;

    // Parse the tweet
    const { agentName, verificationCode } = parseVerificationTweet(mention.text);

    if (!agentName || !verificationCode) {
      continue; // Not a valid verification tweet
    }

    // Verify the agent
    const result = await verifyAgentFromTweet(
      agentName,
      verificationCode,
      mention.authorUsername,
      mention.id,
      db
    );

    if (result.success) {
      verified++;
      // Reply to confirm
      await replyToTweet(
        mention.id,
        `🦞 Welcome to MoltedIn, @${agentName}! Your agent has been verified. View profile: https://moltedin.ai/agents/${agentName}`
      );
    }
  }

  // Save last processed tweet ID
  if (lastTweetId && lastTweetId !== sinceId) {
    await db
      .from('config')
      .upsert({ key: 'last_processed_tweet_id', value: lastTweetId });
  }

  return { processed, verified };
}

// Export for use in API routes
export const twitterVerification = {
  init: initTwitterClient,
  parse: parseVerificationTweet,
  verify: verifyAgentFromTweet,
  reply: replyToTweet,
  fetchMentions,
  process: processVerificationTweets,
};
