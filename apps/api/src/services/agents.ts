import { supabase } from '../db/supabase.js';
import { Agent, AgentPrivate } from '../db/types.js';
import { AppError } from '../middleware/error.js';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

export async function createAgent(
  name: string,
  description?: string
): Promise<{ agent: AgentPrivate; apiKey: string; verificationCode: string }> {
  // Check if name is taken
  const { data: existing } = await supabase
    .from('agents')
    .select('id')
    .eq('name', name.toLowerCase())
    .single();

  if (existing) {
    throw new AppError('name_taken', 'This agent name is already taken', 400);
  }

  // Generate API key and verification code
  const apiKey = `cwrk_${nanoid(32)}`;
  const verificationCode = `CLAW-${nanoid(6).toUpperCase()}`;
  const apiKeyHash = await bcrypt.hash(apiKey, 10);

  // Create agent
  const { data: agent, error } = await supabase
    .from('agents')
    .insert({
      name: name.toLowerCase(),
      description: description || null,
      api_key_hash: apiKeyHash,
      verified: false
    })
    .select()
    .single();

  if (error || !agent) {
    throw new AppError('create_failed', 'Failed to create agent', 500);
  }

  // Create verification code
  await supabase.from('verification_codes').insert({
    agent_id: agent.id,
    code: verificationCode,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    used: false
  });

  return {
    agent: {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      avatar_url: agent.avatar_url,
      verified: agent.verified,
      owner_twitter: agent.owner_twitter,
      a2a_endpoint: agent.a2a_endpoint,
      bio: null,
      portfolio_url: null,
      skills: [],
      stats: { endorsements: 0, connections: 0, views: 0, rating: 0 },
      created_at: agent.created_at
    },
    apiKey,
    verificationCode
  };
}

export async function getAgentById(id: string): Promise<Agent | null> {
  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !agent) return null;

  return enrichAgent(agent);
}

export async function getAgentByName(name: string): Promise<Agent | null> {
  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .eq('name', name.toLowerCase())
    .single();

  if (error || !agent) return null;

  return enrichAgent(agent);
}

async function enrichAgent(agent: any): Promise<Agent> {
  // Get skills
  const { data: skills } = await supabase
    .from('agent_skills')
    .select('skill')
    .eq('agent_id', agent.id);

  // Get endorsement count and average rating
  const { data: endorsements } = await supabase
    .from('endorsements')
    .select('rating')
    .eq('to_agent_id', agent.id);

  // Get connection count
  const { count: connectionCount } = await supabase
    .from('connections')
    .select('*', { count: 'exact', head: true })
    .or(`agent_a.eq.${agent.id},agent_b.eq.${agent.id}`);

  // Get view count
  const { count: viewCount } = await supabase
    .from('profile_views')
    .select('*', { count: 'exact', head: true })
    .eq('viewed_agent_id', agent.id);

  const avgRating = endorsements?.length
    ? endorsements.reduce((sum: number, e: { rating: number }) => sum + e.rating, 0) / endorsements.length
    : 0;

  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    avatar_url: agent.avatar_url,
    verified: agent.verified,
    bio: agent.bio || null,
    portfolio_url: agent.portfolio_url || null,
    skills: agent.skills || [],
    stats: {
      endorsements: endorsements?.length || 0,
      connections: connectionCount || 0,
      views: viewCount || 0,
      rating: Math.round(avgRating * 10) / 10
    },
    created_at: agent.created_at
  };
}

export async function updateAgent(
  id: string,
  updates: { description?: string; avatar_url?: string; a2a_endpoint?: string }
): Promise<Agent> {
  const { data: agent, error } = await supabase
    .from('agents')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !agent) {
    throw new AppError('update_failed', 'Failed to update agent', 500);
  }

  return enrichAgent(agent);
}

export async function verifyAgent(agentId: string, code: string, twitterHandle: string): Promise<boolean> {
  // Check verification code
  const { data: verification } = await supabase
    .from('verification_codes')
    .select('*')
    .eq('agent_id', agentId)
    .eq('code', code)
    .eq('used', false)
    .single();

  if (!verification) {
    throw new AppError('invalid_code', 'Invalid or expired verification code', 400);
  }

  if (new Date(verification.expires_at) < new Date()) {
    throw new AppError('expired_code', 'Verification code has expired', 400);
  }

  // Mark as verified
  await supabase
    .from('agents')
    .update({ verified: true, owner_twitter: twitterHandle })
    .eq('id', agentId);

  // Mark code as used
  await supabase
    .from('verification_codes')
    .update({ used: true })
    .eq('id', verification.id);

  return true;
}

export async function recordProfileView(viewedAgentId: string, viewerAgentId?: string, viewerIp?: string) {
  await supabase.from('profile_views').insert({
    viewed_agent_id: viewedAgentId,
    viewer_agent_id: viewerAgentId || null,
    viewer_ip: viewerIp || null
  });
}

export async function deleteAgent(id: string): Promise<void> {
  await supabase.from('agents').delete().eq('id', id);
}

export async function exportAgentData(id: string): Promise<any> {
  const agent = await getAgentById(id);

  const { data: endorsementsGiven } = await supabase
    .from('endorsements')
    .select('*')
    .eq('from_agent_id', id);

  const { data: endorsementsReceived } = await supabase
    .from('endorsements')
    .select('*')
    .eq('to_agent_id', id);

  const { data: connections } = await supabase
    .from('connections')
    .select('*')
    .or(`agent_a.eq.${id},agent_b.eq.${id}`);

  return {
    agent,
    endorsements: {
      given: endorsementsGiven || [],
      received: endorsementsReceived || []
    },
    connections: connections || [],
    exported_at: new Date().toISOString()
  };
}
