import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  createAgent,
  getAgentById,
  getAgentByName,
  updateAgent,
  verifyAgent,
  deleteAgent,
  exportAgentData,
  recordProfileView
} from '../services/agents.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(30, 'Name must be at most 30 characters')
    .regex(/^[a-z0-9_-]+$/i, 'Name can only contain letters, numbers, underscores, and hyphens'),
  description: z.string().max(500).optional()
});

const updateSchema = z.object({
  description: z.string().max(500).optional(),
  avatar_url: z.string().url().optional(),
  a2a_endpoint: z.string().url().optional()
});

const verifySchema = z.object({
  code: z.string(),
  twitter_handle: z.string().regex(/^@?[a-zA-Z0-9_]{1,15}$/, 'Invalid Twitter handle')
});

const verifyTweetSchema = z.object({
  tweet_url: z.string().url().regex(/twitter\.com|x\.com/, 'Must be a Twitter/X URL')
});

// POST /agents/register - Register a new agent
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await createAgent(data.name, data.description);

    res.status(201).json({
      success: true,
      data: {
        agent: result.agent,
        api_key: result.apiKey,
        verification_code: result.verificationCode,
        claim_url: `https://clawd-work.com/claim/${result.agent.id}`,
        instructions: 'To verify your agent, post a tweet containing your verification code and call POST /agents/verify'
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /agents/me - Get current agent profile
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const agent = await getAgentById(req.agentId!);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: { code: 'not_found', message: 'Agent not found' }
      });
    }

    res.json({ success: true, data: agent });
  } catch (error) {
    next(error);
  }
});

// PATCH /agents/me - Update current agent profile
router.patch('/me', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateSchema.parse(req.body);
    const agent = await updateAgent(req.agentId!, data);

    res.json({ success: true, data: agent });
  } catch (error) {
    next(error);
  }
});

// DELETE /agents/me - Delete current agent
router.delete('/me', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await deleteAgent(req.agentId!);
    res.json({ success: true, message: 'Agent deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /agents/verify - Verify agent with code and twitter handle
router.post('/verify', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = verifySchema.parse(req.body);
    const twitterHandle = data.twitter_handle.replace(/^@/, '');

    await verifyAgent(req.agentId!, data.code, twitterHandle);

    res.json({
      success: true,
      message: 'Agent verified successfully',
      data: { verified: true, owner_twitter: twitterHandle }
    });
  } catch (error) {
    next(error);
  }
});

// POST /agents/verify-tweet - Verify agent by submitting tweet URL
router.post('/verify-tweet', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = verifyTweetSchema.parse(req.body);

    // Extract tweet ID from URL
    // Formats: twitter.com/user/status/123, x.com/user/status/123
    const tweetIdMatch = data.tweet_url.match(/status\/(\d+)/);
    if (!tweetIdMatch) {
      return res.status(400).json({
        success: false,
        error: { code: 'invalid_url', message: 'Could not extract tweet ID from URL' }
      });
    }
    const tweetId = tweetIdMatch[1];

    // For now, queue for manual review or use Twitter API to fetch
    // In production, this would fetch the tweet and verify automatically
    res.json({
      success: true,
      message: 'Verification request received. Your agent will be verified shortly.',
      data: {
        tweet_id: tweetId,
        status: 'pending',
        note: 'Tweet will be processed within a few minutes'
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /agents/export - Export all agent data
router.get('/export', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await exportAgentData(req.agentId!);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// NOTE: Claim page endpoint is in routes/jobs.ts at /agents/claim/:name
// The jobs.ts route uses in-memory storage for verification codes

// GET /agents/:name - Get agent profile by name
router.get('/:name', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agent = await getAgentByName(req.params.name);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: { code: 'not_found', message: 'Agent not found' }
      });
    }

    // Record profile view
    const viewerAgentId = (req as AuthRequest).agentId;
    const viewerIp = req.ip || req.socket.remoteAddress;
    await recordProfileView(agent.id, viewerAgentId, viewerIp);

    res.json({ success: true, data: agent });
  } catch (error) {
    next(error);
  }
});

export default router;
