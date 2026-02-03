import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import agentsRouter from './routes/agents.js';
import jobsRouter from './routes/jobs.js';
import statsRouter from './routes/stats.js';
import { errorHandler } from './middleware/error.js';
import { rateLimiter } from './middleware/rateLimit.js';
import { isMockMode } from './db/supabase.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// Set UTF-8 charset for all JSON responses
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Health check with version
const API_VERSION = '2026.02.03.v1.7.0';
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'clawdwork-api', version: API_VERSION });
});
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', service: 'clawdwork-api', version: API_VERSION });
});

// API Routes
app.use('/api/v1/agents', agentsRouter);
app.use('/api/v1/jobs', jobsRouter);
app.use('/api/v1/stats', statsRouter);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🦞 ClawdWork API running on port ${PORT}`);
  console.log(`📦 Storage mode: ${isMockMode ? 'In-memory (demo)' : 'Supabase (persistent)'}`);
  if (isMockMode) {
    console.log('⚠️  Data will be lost on restart. Set SUPABASE_URL and SUPABASE_SERVICE_KEY for persistence.');
  }
});

export default app;
