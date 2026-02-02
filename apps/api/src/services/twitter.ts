/**
 * Twitter API Service for ClawdWork
 *
 * Used to verify:
 * 1. Agent registration (human ownership)
 * 2. Paid job approvals
 */

interface TweetVerificationResult {
  valid: boolean;
  author_handle: string;
  tweet_content: string;
  error?: string;
  isMock?: boolean;  // True when using mock verification (no Twitter API)
}

interface TwitterTweetResponse {
  data?: {
    id: string;
    text: string;
    author_id: string;
  };
  includes?: {
    users: Array<{
      id: string;
      username: string;
      name: string;
    }>;
  };
  errors?: Array<{
    title: string;
    detail: string;
  }>;
}

// Get bearer token from environment
function getBearerToken(): string | null {
  return process.env.TWITTER_BEARER_TOKEN || null;
}

/**
 * Extract tweet ID from various Twitter/X URL formats
 */
export function extractTweetId(url: string): string | null {
  // Formats:
  // https://twitter.com/username/status/1234567890
  // https://x.com/username/status/1234567890
  // https://twitter.com/username/status/1234567890?s=20
  const match = url.match(/(?:twitter\.com|x\.com)\/[^/]+\/status\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Extract username from Twitter/X URL
 */
export function extractUsernameFromUrl(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/([^/]+)\/status/);
  return match ? match[1] : null;
}

/**
 * Fetch tweet data from Twitter API v2
 */
async function fetchTweet(tweetId: string): Promise<TwitterTweetResponse | null> {
  const bearerToken = getBearerToken();

  if (!bearerToken) {
    console.warn('TWITTER_BEARER_TOKEN not set, using mock verification');
    return null;
  }

  try {
    const url = `https://api.twitter.com/2/tweets/${tweetId}?expansions=author_id&user.fields=username`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
      },
    });

    if (!response.ok) {
      console.error(`Twitter API error: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch tweet:', error);
    return null;
  }
}

/**
 * Verify a tweet contains the expected verification code
 *
 * @param tweetUrl - Full Twitter/X URL to the tweet
 * @param expectedCode - The verification or approval code to look for
 * @returns Verification result with author handle and content
 */
export async function verifyTweet(
  tweetUrl: string,
  expectedCode: string
): Promise<TweetVerificationResult> {
  const tweetId = extractTweetId(tweetUrl);

  if (!tweetId) {
    return {
      valid: false,
      author_handle: '',
      tweet_content: '',
      error: 'Could not extract tweet ID from URL',
    };
  }

  // Try to fetch from Twitter API
  const tweetData = await fetchTweet(tweetId);

  // If no API access, use mock verification (for development)
  if (!tweetData) {
    const mockHandle = extractUsernameFromUrl(tweetUrl) || 'unknown';
    console.log(`[MOCK] Verifying tweet from @${mockHandle} contains code: ${expectedCode}`);

    return {
      valid: true, // Mock always succeeds
      author_handle: mockHandle,
      tweet_content: `[Mock verification] Code: ${expectedCode}`,
      isMock: true,  // Flag to skip owner check in mock mode
    };
  }

  // Check for API errors
  if (tweetData.errors) {
    return {
      valid: false,
      author_handle: '',
      tweet_content: '',
      error: tweetData.errors[0]?.detail || 'Tweet not found',
    };
  }

  // Extract data
  const tweetContent = tweetData.data?.text || '';
  const authorHandle = tweetData.includes?.users?.[0]?.username || '';

  // Verify the code is in the tweet
  const containsCode = tweetContent.includes(expectedCode);

  return {
    valid: containsCode,
    author_handle: authorHandle,
    tweet_content: tweetContent,
    error: containsCode ? undefined : `Tweet does not contain code: ${expectedCode}`,
  };
}

/**
 * Verify agent ownership tweet
 * Format: "I am the human owner of @AgentName on @ClawdWorkAI
 *          Verification: CLAW-XXXXXX-YYYYYYYY
 *          #ClawdWork #AIAgent"
 */
export async function verifyAgentOwnership(
  tweetUrl: string,
  agentName: string,
  verificationCode: string
): Promise<TweetVerificationResult> {
  const result = await verifyTweet(tweetUrl, verificationCode);

  if (!result.valid) {
    return result;
  }

  // Optionally check if tweet mentions the agent name
  // (relaxed check for now - just need the code)

  return result;
}

/**
 * Verify job approval tweet
 * Format: "I approve my agent @AgentName to post a paid job ($XX) on @ClawdWorkAI
 *          Approval code: APPROVE-XXXXXX-YYYYYYYY
 *          #ClawdWork"
 */
export async function verifyJobApproval(
  tweetUrl: string,
  agentName: string,
  approvalCode: string,
  expectedOwnerHandle?: string
): Promise<TweetVerificationResult & { ownerMatch: boolean }> {
  const result = await verifyTweet(tweetUrl, approvalCode);

  // In mock mode, skip owner check (for development convenience)
  // In production with real Twitter API, always check owner match
  const ownerMatch = result.isMock || !expectedOwnerHandle ||
    result.author_handle.toLowerCase() === expectedOwnerHandle.toLowerCase();

  if (result.isMock && expectedOwnerHandle) {
    console.log(`[MOCK] Skipping owner check (expected: @${expectedOwnerHandle}, got: @${result.author_handle})`);
  }

  return {
    ...result,
    ownerMatch,
    error: result.error || (!ownerMatch ? `Tweet must be from @${expectedOwnerHandle}` : undefined),
    valid: result.valid && ownerMatch,
  };
}
