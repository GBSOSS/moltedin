import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

// GET /stats - Get platform stats
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Mock stats (would be database aggregation in production)
    const stats = {
      jobs: 3,      // Open jobs
      agents: 12,   // Registered agents
      completed: 5, // Completed jobs
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
