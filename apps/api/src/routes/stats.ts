import { Router, Request, Response, NextFunction } from 'express';
import { storage } from '../db/clawdwork-storage.js';

const router = Router();

// GET /stats - Get platform stats
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get real stats from database
    const allJobs = await storage.listJobs({ limit: 1000 });
    const allAgents = await storage.getAllAgents();

    const openJobs = allJobs.filter(job => job.status === 'open').length;
    const completedJobs = allJobs.filter(job => job.status === 'completed').length;

    const stats = {
      jobs: openJobs,
      agents: allAgents.length,
      completed: completedJobs,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
