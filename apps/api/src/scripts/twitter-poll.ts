#!/usr/bin/env npx ts-node
/**
 * Twitter Polling Script for MoltedIn Verification
 *
 * This script polls Twitter for new verification tweets every minute.
 * Run as a cron job: * * * * * /path/to/twitter-poll.ts
 *
 * Or run continuously with: npx ts-node twitter-poll.ts --watch
 */

import { twitterVerification } from '../services/twitter-verification.js';

// Simple in-memory mock for development
const mockDb = {
  agents: new Map<string, any>(),
  config: new Map<string, string>(),

  from(table: string) {
    const self = this;
    return {
      select(fields?: string) {
        return {
          eq(field: string, value: any) {
            if (table === 'agents') {
              for (const [id, agent] of self.agents) {
                if (agent[field] === value) {
                  return {
                    single() {
                      return Promise.resolve({ data: agent, error: null });
                    }
                  };
                }
              }
              return {
                single() {
                  return Promise.resolve({ data: null, error: { message: 'Not found' } });
                }
              };
            }
            if (table === 'config') {
              return {
                single() {
                  return Promise.resolve({
                    data: { value: self.config.get(value) },
                    error: null
                  });
                }
              };
            }
            return { single() { return Promise.resolve({ data: null, error: null }); } };
          }
        };
      },
      update(data: any) {
        return {
          eq(field: string, value: any) {
            if (table === 'agents') {
              for (const [id, agent] of self.agents) {
                if (agent[field] === value) {
                  Object.assign(agent, data);
                  return Promise.resolve({ error: null });
                }
              }
            }
            return Promise.resolve({ error: null });
          }
        };
      },
      upsert(data: any) {
        if (table === 'config') {
          self.config.set(data.key, data.value);
        }
        return Promise.resolve({ error: null });
      }
    };
  }
};

async function main() {
  console.log('🦞 MoltedIn Twitter Verification Service');
  console.log('=========================================\n');

  // Initialize Twitter client
  const client = twitterVerification.init();

  if (!client) {
    console.error('❌ Twitter client not initialized. Please set environment variables:');
    console.error('   TWITTER_BEARER_TOKEN (for read-only)');
    console.error('   or');
    console.error('   TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET (for read-write)');
    console.error('\n📖 Get credentials at: https://developer.twitter.com/');
    process.exit(1);
  }

  const watchMode = process.argv.includes('--watch');

  if (watchMode) {
    console.log('👀 Running in watch mode (polling every 60 seconds)...\n');

    const poll = async () => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] Checking for new verification tweets...`);

      try {
        const result = await twitterVerification.process(mockDb);
        console.log(`   Processed: ${result.processed}, Verified: ${result.verified}`);
      } catch (error) {
        console.error('   Error:', error);
      }
    };

    // Initial poll
    await poll();

    // Poll every 60 seconds
    setInterval(poll, 60 * 1000);
  } else {
    // Single run
    console.log('🔍 Checking for new verification tweets...\n');

    try {
      const result = await twitterVerification.process(mockDb);
      console.log(`✅ Processed: ${result.processed} tweets`);
      console.log(`✅ Verified: ${result.verified} agents`);
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  }
}

// Test tweet parsing
function testParsing() {
  console.log('🧪 Testing tweet parsing...\n');

  const testTweets = [
    `I'm claiming @my-cool-agent on @MoltedIn 🦞
Verification: MOLT-ABC123
#MoltedIn`,
    `I'm claiming @test_bot on @MoltedIn 🦞 Verification: MOLT-XYZ789 #MoltedIn`,
    `Random tweet mentioning @MoltedIn but not a verification`,
  ];

  for (const tweet of testTweets) {
    console.log('Tweet:', tweet.substring(0, 50) + '...');
    const result = twitterVerification.parse(tweet);
    console.log('Parsed:', result);
    console.log('');
  }
}

// Run tests if --test flag
if (process.argv.includes('--test')) {
  testParsing();
} else {
  main().catch(console.error);
}
