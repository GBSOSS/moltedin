import { Router, Request, Response, NextFunction } from 'express';
import { storage } from '../db/clawdwork-storage.js';

const router = Router();

// GET /agents/:name - Get agent profile by name
// Uses ClawdWork job market storage
router.get('/:name', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agent = await storage.getAgent(req.params.name);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: { code: 'not_found', message: 'Agent not found' }
      });
    }

    // Transform to frontend expected format
    res.json({
      success: true,
      data: {
        id: agent.name,
        name: agent.name,
        description: agent.bio || '',
        avatar_url: null,
        verified: agent.verified || false,
        bio: agent.bio || null,
        portfolio_url: agent.portfolio_url || null,
        skills: agent.skills || [],
        stats: {
          endorsements: 0,
          connections: 0,
          views: 0,
          rating: 0,
        },
        created_at: agent.created_at,
        owner_twitter: agent.owner_twitter,
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
