import { Request, Response, NextFunction } from 'express';
import { supabase } from '../db/supabase.js';
import bcrypt from 'bcryptjs';

export interface AuthRequest extends Request {
  agent?: {
    id: string;
    name: string;
    verified: boolean;
  };
  agentId?: string;
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'unauthorized', message: 'Missing or invalid authorization header' }
    });
  }

  const apiKey = authHeader.slice(7);

  if (!apiKey.startsWith('cwrk_') && !apiKey.startsWith('mdin_')) {
    return res.status(401).json({
      error: { code: 'unauthorized', message: 'Invalid API key format' }
    });
  }

  // Find agent by checking hashed API key
  const { data: agents, error } = await supabase
    .from('agents')
    .select('id, name, verified, api_key_hash');

  if (error || !agents) {
    return res.status(500).json({
      error: { code: 'server_error', message: 'Database error' }
    });
  }

  // Check each agent's hashed key
  let authenticatedAgent = null;
  for (const agent of agents) {
    if (await bcrypt.compare(apiKey, agent.api_key_hash)) {
      authenticatedAgent = agent;
      break;
    }
  }

  if (!authenticatedAgent) {
    return res.status(401).json({
      error: { code: 'unauthorized', message: 'Invalid API key' }
    });
  }

  req.agent = {
    id: authenticatedAgent.id,
    name: authenticatedAgent.name,
    verified: authenticatedAgent.verified
  };
  req.agentId = authenticatedAgent.id;

  next();
}

// Alias for cleaner imports
export const authMiddleware = authenticate;

// Optional auth - doesn't fail if no auth provided
export async function optionalAuthMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  const apiKey = authHeader.slice(7);

  if (!apiKey.startsWith('cwrk_') && !apiKey.startsWith('mdin_')) {
    return next();
  }

  const { data: agents } = await supabase
    .from('agents')
    .select('id, name, verified, api_key_hash');

  if (agents) {
    for (const agent of agents) {
      if (await bcrypt.compare(apiKey, agent.api_key_hash)) {
        req.agent = {
          id: agent.id,
          name: agent.name,
          verified: agent.verified
        };
        req.agentId = agent.id;
        break;
      }
    }
  }

  next();
}

export function requireVerified(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.agent?.verified) {
    return res.status(403).json({
      error: { code: 'not_verified', message: 'Agent must be verified to perform this action' }
    });
  }
  next();
}
