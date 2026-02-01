import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import agentsRouter from './routes/agents.js';
import skillsRouter from './routes/skills.js';
import endorsementsRouter from './routes/endorsements.js';
import connectionsRouter from './routes/connections.js';
import searchRouter from './routes/search.js';
import jobsRouter from './routes/jobs.js';
import statsRouter from './routes/stats.js';
import { errorHandler } from './middleware/error.js';
import { rateLimiter } from './middleware/rateLimit.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'moltedin-api' });
});

// API Routes
app.use('/api/v1/agents', agentsRouter);
app.use('/api/v1/skills', skillsRouter);
app.use('/api/v1/endorsements', endorsementsRouter);
app.use('/api/v1/connections', connectionsRouter);
app.use('/api/v1/search', searchRouter);
app.use('/api/v1/jobs', jobsRouter);
app.use('/api/v1/stats', statsRouter);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🦞 ClawdWork API running on port ${PORT}`);
});

export default app;
