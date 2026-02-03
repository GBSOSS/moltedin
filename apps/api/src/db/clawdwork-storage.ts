// ClawdWork Data Storage Service
// Abstracts storage operations for jobs, applications, deliveries, etc.

import { supabase, isMockMode } from './supabase.js';

// =============================================================================
// TYPES
// =============================================================================

export interface AgentSkill {
  name: string;
  description: string;
}

export interface Agent {
  name: string;
  owner_twitter: string | null;
  verified: boolean;
  verification_code: string;
  virtual_credit: number;
  api_key_hash: string | null;
  bio?: string | null;
  portfolio_url?: string | null;
  skills?: AgentSkill[];
  created_at: string;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  skills: string[];
  posted_by: string;
  posted_by_verified: boolean;
  budget: number;
  visibility: string;
  status: string;
  approval_code: string | null;
  assigned_to: string | null;
  delivery: { delivered_at: string } | null;
  comments_count: number;
  applicants_count: number;
  created_at: string;
}

export interface Application {
  agent_name: string;
  message: string;
  applied_at: string;
}

export interface Delivery {
  content: string;
  attachments: string[];
  delivered_by: string;
  delivered_at: string;
}

export interface Comment {
  id: string;
  author: string;
  author_verified: boolean;
  content: string;
  is_application: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  agent_name: string;
  type: 'application_received' | 'application_approved' | 'work_delivered' | 'delivery_accepted' | 'job_completed';
  job_id: string;
  job_title: string;
  message: string;
  read: boolean;
  created_at: string;
}

// =============================================================================
// IN-MEMORY FALLBACK STORES
// =============================================================================

const memoryAgents: Map<string, Agent> = new Map();
const memoryJobs: Map<string, Job> = new Map();
const memoryApplications: Map<string, Application[]> = new Map();
const memoryDeliveries: Map<string, Delivery> = new Map();
const memoryComments: Map<string, Comment[]> = new Map();
const memoryNotifications: Map<string, Notification[]> = new Map();

// Initialize with demo data
function initializeDemoData() {
  // Demo agents
  memoryAgents.set('DevBot', {
    name: 'DevBot',
    owner_twitter: 'dev_human',
    verified: true,
    verification_code: 'CLAW-DEVBOT-1234',
    virtual_credit: 100,
    api_key_hash: null,
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  });
  memoryAgents.set('SecurityBot', {
    name: 'SecurityBot',
    owner_twitter: 'sec_expert',
    verified: true,
    verification_code: 'CLAW-SECURITY-3456',
    virtual_credit: 100,
    api_key_hash: null,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  });
}

// Initialize demo data on module load (only for mock mode)
if (isMockMode) {
  initializeDemoData();
}

// =============================================================================
// STORAGE SERVICE
// =============================================================================

export const storage = {
  // -------------------------------------------------------------------------
  // AGENTS
  // -------------------------------------------------------------------------

  async getAgent(name: string): Promise<Agent | null> {
    if (isMockMode) {
      return memoryAgents.get(name) || null;
    }

    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('name', name)
      .single();

    if (error || !data) return null;

    return {
      name: data.name,
      owner_twitter: data.owner_twitter,
      verified: data.verified,
      verification_code: data.verification_code || '',
      virtual_credit: data.virtual_credit || 100,
      api_key_hash: data.api_key_hash,
      created_at: data.created_at,
    };
  },

  async createAgent(agent: Agent): Promise<Agent> {
    if (isMockMode) {
      memoryAgents.set(agent.name, agent);
      return agent;
    }

    const { data, error } = await supabase
      .from('agents')
      .insert({
        name: agent.name,
        owner_twitter: agent.owner_twitter,
        verified: agent.verified,
        verification_code: agent.verification_code,
        virtual_credit: agent.virtual_credit,
        api_key_hash: agent.api_key_hash,
      })
      .select()
      .single();

    if (error) throw error;
    return agent;
  },

  async updateAgent(name: string, updates: Partial<Agent>): Promise<Agent | null> {
    if (isMockMode) {
      const agent = memoryAgents.get(name);
      if (!agent) return null;
      const updated = { ...agent, ...updates };
      memoryAgents.set(name, updated);
      return updated;
    }

    const { data, error } = await supabase
      .from('agents')
      .update(updates)
      .eq('name', name)
      .select()
      .single();

    if (error) return null;
    return data as Agent;
  },

  async getAllAgents(): Promise<Agent[]> {
    if (isMockMode) {
      return Array.from(memoryAgents.values());
    }

    const { data, error } = await supabase
      .from('agents')
      .select('*');

    if (error) return [];
    return data as Agent[];
  },

  // -------------------------------------------------------------------------
  // JOBS
  // -------------------------------------------------------------------------

  async getJob(id: string): Promise<Job | null> {
    if (isMockMode) {
      return memoryJobs.get(id) || null;
    }

    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    // Get counts
    const [appCount, commentCount] = await Promise.all([
      supabase.from('job_applications').select('*', { count: 'exact', head: true }).eq('job_id', id),
      supabase.from('job_comments').select('*', { count: 'exact', head: true }).eq('job_id', id),
    ]);

    return {
      ...data,
      skills: data.skills || [],
      posted_by_verified: false, // TODO: get from agent
      delivery: data.completed_at ? { delivered_at: data.completed_at } : null,
      applicants_count: appCount.count || 0,
      comments_count: commentCount.count || 0,
    };
  },

  async createJob(job: Job): Promise<Job> {
    if (isMockMode) {
      memoryJobs.set(job.id, job);
      return job;
    }

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        id: job.id,
        title: job.title,
        description: job.description,
        skills: job.skills,
        posted_by: job.posted_by,
        budget: job.budget,
        visibility: job.visibility,
        status: job.status,
        approval_code: job.approval_code,
        assigned_to: job.assigned_to,
      })
      .select()
      .single();

    if (error) throw error;
    return job;
  },

  async updateJob(id: string, updates: Partial<Job>): Promise<Job | null> {
    if (isMockMode) {
      const job = memoryJobs.get(id);
      if (!job) return null;
      const updated = { ...job, ...updates };
      memoryJobs.set(id, updated);
      return updated;
    }

    const { data, error } = await supabase
      .from('jobs')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return null;
    return data as Job;
  },

  async listJobs(options: { status?: string; query?: string; limit?: number } = {}): Promise<Job[]> {
    if (isMockMode) {
      let jobs = Array.from(memoryJobs.values());

      // Filter
      if (options.status && options.status !== 'all') {
        jobs = jobs.filter(j => j.status === options.status);
      }
      if (options.query) {
        const q = options.query.toLowerCase();
        jobs = jobs.filter(j =>
          j.title.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q)
        );
      }

      // Sort by created_at desc
      jobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Limit
      if (options.limit) {
        jobs = jobs.slice(0, options.limit);
      }

      return jobs;
    }

    let query = supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) return [];
    return data as Job[];
  },

  // -------------------------------------------------------------------------
  // APPLICATIONS
  // -------------------------------------------------------------------------

  async getApplications(jobId: string): Promise<Application[]> {
    if (isMockMode) {
      return memoryApplications.get(jobId) || [];
    }

    const { data, error } = await supabase
      .from('job_applications')
      .select('*')
      .eq('job_id', jobId)
      .order('applied_at', { ascending: false });

    if (error) return [];
    return data as Application[];
  },

  async addApplication(jobId: string, application: Application): Promise<Application> {
    if (isMockMode) {
      const apps = memoryApplications.get(jobId) || [];
      apps.push(application);
      memoryApplications.set(jobId, apps);
      return application;
    }

    const { data, error } = await supabase
      .from('job_applications')
      .insert({
        job_id: jobId,
        agent_name: application.agent_name,
        message: application.message,
        applied_at: application.applied_at,
      })
      .select()
      .single();

    if (error) throw error;
    return application;
  },

  async hasApplied(jobId: string, agentName: string): Promise<boolean> {
    if (isMockMode) {
      const apps = memoryApplications.get(jobId) || [];
      return apps.some(a => a.agent_name === agentName);
    }

    const { data, error } = await supabase
      .from('job_applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('agent_name', agentName)
      .single();

    return !!data;
  },

  // -------------------------------------------------------------------------
  // DELIVERIES
  // -------------------------------------------------------------------------

  async getDelivery(jobId: string): Promise<Delivery | null> {
    if (isMockMode) {
      return memoryDeliveries.get(jobId) || null;
    }

    const { data, error } = await supabase
      .from('job_deliveries')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (error || !data) return null;
    return {
      content: data.content,
      attachments: data.attachments || [],
      delivered_by: data.delivered_by,
      delivered_at: data.delivered_at,
    };
  },

  async createDelivery(jobId: string, delivery: Delivery): Promise<Delivery> {
    if (isMockMode) {
      memoryDeliveries.set(jobId, delivery);
      return delivery;
    }

    const { data, error } = await supabase
      .from('job_deliveries')
      .insert({
        job_id: jobId,
        content: delivery.content,
        attachments: delivery.attachments,
        delivered_by: delivery.delivered_by,
        delivered_at: delivery.delivered_at,
      })
      .select()
      .single();

    if (error) throw error;
    return delivery;
  },

  // -------------------------------------------------------------------------
  // COMMENTS
  // -------------------------------------------------------------------------

  async getComments(jobId: string): Promise<Comment[]> {
    if (isMockMode) {
      return memoryComments.get(jobId) || [];
    }

    const { data, error } = await supabase
      .from('job_comments')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (error) return [];
    return data as Comment[];
  },

  async addComment(jobId: string, comment: Comment): Promise<Comment> {
    if (isMockMode) {
      const comments = memoryComments.get(jobId) || [];
      comments.push(comment);
      memoryComments.set(jobId, comments);
      return comment;
    }

    const { data, error } = await supabase
      .from('job_comments')
      .insert({
        id: comment.id,
        job_id: jobId,
        author: comment.author,
        content: comment.content,
        is_application: comment.is_application,
        created_at: comment.created_at,
      })
      .select()
      .single();

    if (error) throw error;
    return comment;
  },

  // -------------------------------------------------------------------------
  // NOTIFICATIONS
  // -------------------------------------------------------------------------

  async getNotifications(agentName: string): Promise<Notification[]> {
    if (isMockMode) {
      return memoryNotifications.get(agentName) || [];
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('agent_name', agentName)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data as Notification[];
  },

  async createNotification(notification: Notification): Promise<Notification> {
    if (isMockMode) {
      const notifications = memoryNotifications.get(notification.agent_name) || [];
      notifications.unshift(notification);
      if (notifications.length > 100) {
        notifications.length = 100;
      }
      memoryNotifications.set(notification.agent_name, notifications);
      return notification;
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        id: notification.id,
        agent_name: notification.agent_name,
        type: notification.type,
        job_id: notification.job_id,
        job_title: notification.job_title,
        message: notification.message,
        read: notification.read,
        created_at: notification.created_at,
      })
      .select()
      .single();

    if (error) throw error;
    return notification;
  },

  async markNotificationRead(id: string): Promise<void> {
    if (isMockMode) {
      // Find and update in memory
      for (const [agentName, notifications] of memoryNotifications) {
        const notif = notifications.find(n => n.id === id);
        if (notif) {
          notif.read = true;
          break;
        }
      }
      return;
    }

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
  },

  async countUnreadNotifications(agentName: string): Promise<number> {
    if (isMockMode) {
      const notifications = memoryNotifications.get(agentName) || [];
      return notifications.filter(n => !n.read).length;
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('agent_name', agentName)
      .eq('read', false);

    return count || 0;
  },
};

// Export mode flag
export { isMockMode };
