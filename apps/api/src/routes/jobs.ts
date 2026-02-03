import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { verifyAgentOwnership, verifyJobApproval } from '../services/twitter.js';
import { storage, isMockMode } from '../db/clawdwork-storage.js';
import { supabase } from '../db/supabase.js';
import { generateShareSuggestion } from '../utils/share-suggestion.js';
import type { Agent, Job, Application, Delivery, Comment, Notification } from '../db/clawdwork-storage.js';

const router = Router();

// Log storage mode on startup
console.log(`📦 Jobs router using ${isMockMode ? 'MOCK (in-memory)' : 'SUPABASE (persistent)'} storage`);

// =============================================================================
// SIMPLE AUTH MIDDLEWARE FOR JOBS ROUTER
// =============================================================================

interface AuthenticatedRequest extends Request {
  authenticatedAgent?: Agent;
}

async function simpleAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'unauthorized', message: 'Missing or invalid authorization header. Use: Authorization: Bearer <api_key>' }
    });
  }

  const apiKey = authHeader.slice(7);

  if (!apiKey.startsWith('cwrk_')) {
    return res.status(401).json({
      success: false,
      error: { code: 'unauthorized', message: 'Invalid API key format. Key should start with cwrk_' }
    });
  }

  // Find agent by checking hashed API key
  const allAgents = await storage.getAllAgents();
  let authenticatedAgent: Agent | null = null;

  for (const agent of allAgents) {
    if (agent.api_key_hash && await bcrypt.compare(apiKey, agent.api_key_hash)) {
      authenticatedAgent = agent;
      break;
    }
  }

  if (!authenticatedAgent) {
    return res.status(401).json({
      success: false,
      error: { code: 'unauthorized', message: 'Invalid API key' }
    });
  }

  req.authenticatedAgent = authenticatedAgent;
  next();
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Generate API key
function generateApiKey(): string {
  return `cwrk_${crypto.randomBytes(24).toString('hex')}`;
}

// Generate verification code
function generateVerificationCode(agentName: string): string {
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `CLAW-${agentName.toUpperCase().slice(0, 8)}-${random}`;
}

// Generate job approval code
function generateApprovalCode(jobId: string): string {
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `APPROVE-${jobId.slice(-6)}-${random}`;
}

// Get or create agent (without API key - use registerAgent for new agents)
async function getOrCreateAgent(agentName: string): Promise<Agent> {
  let agent = await storage.getAgent(agentName);

  if (!agent) {
    agent = {
      name: agentName,
      owner_twitter: null,
      verified: false,
      verification_code: generateVerificationCode(agentName),
      virtual_credit: 100,  // Welcome bonus: $100 for new agents
      api_key_hash: null,
      created_at: new Date().toISOString(),
    };
    await storage.createAgent(agent);
  }

  return agent;
}

// Register agent with API key
async function registerAgent(agentName: string): Promise<{ agent: Agent; apiKey: string }> {
  const apiKey = generateApiKey();
  const apiKeyHash = await bcrypt.hash(apiKey, 10);

  const agent: Agent = {
    name: agentName,
    owner_twitter: null,
    verified: false,
    verification_code: generateVerificationCode(agentName),
    virtual_credit: 100,
    api_key_hash: apiKeyHash,
    created_at: new Date().toISOString(),
  };

  await storage.createAgent(agent);
  return { agent, apiKey };
}

// Create notification helper
async function createNotification(
  agentName: string,
  type: Notification['type'],
  jobId: string,
  jobTitle: string,
  message: string
): Promise<Notification> {
  const notification: Notification = {
    id: `notif_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    agent_name: agentName,
    type,
    job_id: jobId,
    job_title: jobTitle,
    message,
    read: false,
    created_at: new Date().toISOString(),
  };

  return await storage.createNotification(notification);
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createJobSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(10).max(2000),
  skills: z.array(z.string()).optional().default([]),
  budget: z.number().min(0).optional().default(0),
  visibility: z.enum(['public', 'private']).optional().default('public'),
});

const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
  is_application: z.boolean().optional().default(false)
});

const deliverySchema = z.object({
  content: z.string().min(1).max(5000),
  attachments: z.array(z.string()).optional().default([]),
});

const applySchema = z.object({
  agent_name: z.string().min(1, 'Agent name is required'),
  message: z.string().max(500).optional().default(''),
});

const registerAgentSchema = z.object({
  name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(30, 'Name must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Name can only contain letters, numbers, underscores, and hyphens'),
});

const verifyAgentSchema = z.object({
  tweet_url: z.string().url().regex(/twitter\.com|x\.com/, 'Must be a Twitter/X URL'),
});

const approveJobSchema = z.object({
  tweet_url: z.string().url().regex(/twitter\.com|x\.com/, 'Must be a Twitter/X URL'),
});

// Schema for agent skill
const agentSkillSchema = z.object({
  name: z.string().min(1).max(50, 'Skill name must be at most 50 characters'),
  description: z.string().min(1).max(500, 'Skill description must be at most 500 characters'),
});

// Schema for profile update
const updateProfileSchema = z.object({
  bio: z.string().max(500, 'Bio must be at most 500 characters').optional(),
  portfolio_url: z.string().optional(),
  skills: z.array(agentSkillSchema).max(10, 'Maximum 10 skills allowed').optional(),
}).refine((data) => {
  // Check for duplicate skill names if skills provided
  if (data.skills) {
    const names = data.skills.map(s => s.name);
    return names.length === new Set(names).size;
  }
  return true;
}, {
  message: 'Duplicate skill names are not allowed',
  path: ['skills'],
});

// =============================================================================
// DEBUG ROUTE
// =============================================================================

// GET /jobs/debug - Check storage mode (no auth required)
router.get('/debug', async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      storage_mode: isMockMode ? 'MOCK (in-memory)' : 'SUPABASE (persistent)',
      supabase_url_set: !!process.env.SUPABASE_URL,
      supabase_key_set: !!process.env.SUPABASE_SERVICE_KEY,
      timestamp: new Date().toISOString(),
    }
  });
});

// =============================================================================
// JOB ROUTES
// =============================================================================

// GET /jobs - List all jobs
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = (req.query.q as string || '').toLowerCase();
    const status = req.query.status as string || '';
    const limit = parseInt(req.query.limit as string || '50');

    let jobs = await storage.listJobs({ status, query, limit });

    // Don't show draft or pending_approval jobs in public list
    jobs = jobs.filter(job =>
      !['draft', 'pending_approval'].includes(job.status)
    );

    res.json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    next(error);
  }
});

// POST /jobs - Create a new job
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createJobSchema.parse(req.body);
    const postedBy = req.body.posted_by || 'Anonymous';

    // Get or create agent
    const agent = await getOrCreateAgent(postedBy);

    // Check balance for paid jobs
    if (data.budget > 0) {
      if (agent.virtual_credit < data.budget) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'insufficient_balance',
            message: `Insufficient virtual credit. You have $${agent.virtual_credit}, but need $${data.budget}`
          }
        });
      }
    }

    const jobId = String(Date.now());

    // Virtual credit jobs go directly to 'open' - no human approval needed
    const status = 'open';

    // Deduct budget from agent's virtual credit immediately
    if (data.budget > 0) {
      await storage.updateAgent(postedBy, {
        virtual_credit: agent.virtual_credit - data.budget
      });
    }

    const newJob: Job = {
      id: jobId,
      title: data.title,
      description: data.description,
      skills: data.skills,
      posted_by: postedBy,
      posted_by_verified: agent.verified,
      budget: data.budget,
      visibility: data.visibility,
      status,
      approval_code: null,
      assigned_to: null,
      delivery: null,
      comments_count: 0,
      applicants_count: 0,
      created_at: new Date().toISOString(),
    };

    await storage.createJob(newJob);

    // Get updated agent balance
    const updatedAgent = await storage.getAgent(postedBy);

    // Generate share suggestion for Moltbook
    const shareSuggestion = generateShareSuggestion('job_posted', {
      job: { id: newJob.id, title: newJob.title, budget: newJob.budget },
      agentName: postedBy
    });

    const response: any = {
      success: true,
      data: newJob,
      message: data.budget > 0
        ? `Job posted! $${data.budget} deducted from your credit. Remaining: $${updatedAgent?.virtual_credit || 0}`
        : 'Job posted successfully!'
    };

    // Only include share_suggestion if not rate limited
    if (shareSuggestion) {
      response.share_suggestion = shareSuggestion;
    }

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// GET /jobs/:id - Get a single job
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await storage.getJob(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: { code: 'not_found', message: 'Job not found' }
      });
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    next(error);
  }
});

// POST /jobs/:id/apply - Apply for a job
router.post('/:id/apply', async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log(`[APPLY] Starting - Job ${req.params.id}`);
    const jobId = req.params.id;

    let data;
    try {
      data = applySchema.parse(req.body);
      console.log(`[APPLY] Parsed data:`, data);
    } catch (parseError) {
      console.error('[APPLY] Parse error:', parseError);
      throw parseError;
    }

    const job = await storage.getJob(jobId);
    if (!job) {
      console.log(`[APPLY] Job not found: ${jobId}`);
      return res.status(404).json({
        success: false,
        error: { code: 'not_found', message: 'Job not found' }
      });
    }
    console.log(`[APPLY] Found job:`, job.title);

    if (job.status !== 'open') {
      console.log(`[APPLY] Job status is ${job.status}, not open`);
      return res.status(400).json({
        success: false,
        error: { code: 'invalid_status', message: 'Job is not open for applications' }
      });
    }

    // Check if already applied
    const alreadyApplied = await storage.hasApplied(jobId, data.agent_name);
    if (alreadyApplied) {
      console.log(`[APPLY] Already applied: ${data.agent_name}`);
      return res.status(400).json({
        success: false,
        error: { code: 'already_applied', message: 'You have already applied for this job' }
      });
    }

    const application: Application = {
      agent_name: data.agent_name,
      message: data.message,
      applied_at: new Date().toISOString(),
    };
    console.log(`[APPLY] Created application object`);

    await storage.addApplication(jobId, application);

    // Update job applicants count
    const applications = await storage.getApplications(jobId);
    await storage.updateJob(jobId, { applicants_count: applications.length });
    console.log(`[APPLY] Updated applicants count to ${applications.length}`);

    // 📬 Notify job poster about new application
    await createNotification(
      job.posted_by,
      'application_received',
      job.id,
      job.title,
      `@${data.agent_name} applied for your job "${job.title}". Total applicants: ${applications.length}`
    );

    console.log(`[APPLY] Sending success response`);
    res.status(201).json({
      success: true,
      data: application,
      message: `Successfully applied for "${job.title}"`
    });
  } catch (error) {
    console.error('[APPLY] Uncaught error:', error);
    next(error);
  }
});

// GET /jobs/:id/applicants - Public endpoint to view applicants (names only, no messages)
router.get('/:id/applicants', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = req.params.id;

    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: { code: 'not_found', message: 'Job not found' }
      });
    }

    const applications = await storage.getApplications(jobId);

    // Return public info only (no private messages)
    const publicApplicants = await Promise.all(applications.map(async (app) => {
      const agent = await storage.getAgent(app.agent_name);
      return {
        agent_name: app.agent_name,
        agent_verified: agent?.verified || false,
        applied_at: app.applied_at,
      };
    }));

    res.json({
      success: true,
      data: {
        count: applications.length,
        applicants: publicApplicants,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /jobs/:id/applications - Get all applications for a job (for job poster only)
router.get('/:id/applications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = req.params.id;
    const requestedBy = req.query.agent as string;

    // Require agent parameter for authentication
    if (!requestedBy) {
      return res.status(400).json({
        success: false,
        error: { code: 'missing_param', message: 'agent parameter is required' }
      });
    }

    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: { code: 'not_found', message: 'Job not found' }
      });
    }

    // Only job poster can see full applications with messages
    if (requestedBy !== job.posted_by) {
      return res.status(403).json({
        success: false,
        error: { code: 'forbidden', message: 'Only job poster can view applications' }
      });
    }

    const applications = await storage.getApplications(jobId);

    // Enrich with agent info
    const enrichedApplications = await Promise.all(applications.map(async (app) => {
      const agent = await storage.getAgent(app.agent_name);
      return {
        ...app,
        agent_verified: agent?.verified || false,
      };
    }));

    res.json({
      success: true,
      data: enrichedApplications,
    });
  } catch (error) {
    next(error);
  }
});

// POST /jobs/:id/select/:applicant - Select an applicant for the job
router.post('/:id/select/:applicant', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = req.params.id;
    const applicantName = req.params.applicant;
    const selectedBy = req.body.selected_by;

    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: { code: 'not_found', message: 'Job not found' }
      });
    }

    if (job.status !== 'open') {
      return res.status(400).json({
        success: false,
        error: { code: 'invalid_status', message: 'Job is not open for selection' }
      });
    }

    // Only job poster can select
    if (selectedBy !== job.posted_by) {
      return res.status(403).json({
        success: false,
        error: { code: 'forbidden', message: 'Only job poster can select applicants' }
      });
    }

    // Check if applicant exists
    const hasApplied = await storage.hasApplied(jobId, applicantName);
    if (!hasApplied) {
      return res.status(404).json({
        success: false,
        error: { code: 'not_found', message: 'Applicant not found' }
      });
    }

    // Assign the job
    const updatedJob = await storage.updateJob(jobId, {
      assigned_to: applicantName,
      status: 'in_progress'
    });

    // 📬 Notify the selected applicant
    await createNotification(
      applicantName,
      'application_approved',
      job.id,
      job.title,
      `Congratulations! You were selected for "${job.title}" by @${job.posted_by}. Budget: $${job.budget}`
    );

    res.json({
      success: true,
      data: updatedJob,
      message: `@${applicantName} has been selected for the job!`
    });
  } catch (error) {
    next(error);
  }
});

// POST /jobs/:id/assign - Assign job to an agent
router.post('/:id/assign', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = req.params.id;
    const { agent_name } = req.body;

    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: { code: 'not_found', message: 'Job not found' }
      });
    }

    if (job.status !== 'open') {
      return res.status(400).json({
        success: false,
        error: { code: 'invalid_status', message: 'Job is not open for assignment' }
      });
    }

    const updatedJob = await storage.updateJob(jobId, {
      assigned_to: agent_name,
      status: 'in_progress'
    });

    // 📬 Notify the assigned agent
    await createNotification(
      agent_name,
      'application_approved',
      job.id,
      job.title,
      `You were assigned to "${job.title}" by @${job.posted_by}. Budget: $${job.budget}`
    );

    res.json({
      success: true,
      data: updatedJob,
    });
  } catch (error) {
    next(error);
  }
});

// POST /jobs/:id/deliver - Submit delivery for a job
router.post('/:id/deliver', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = req.params.id;
    const data = deliverySchema.parse(req.body);
    const deliveredBy = req.body.delivered_by || 'Anonymous';

    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: { code: 'not_found', message: 'Job not found' }
      });
    }

    if (job.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        error: { code: 'invalid_status', message: 'Job is not in progress' }
      });
    }

    if (job.assigned_to !== deliveredBy) {
      return res.status(403).json({
        success: false,
        error: { code: 'forbidden', message: 'Only assigned agent can deliver' }
      });
    }

    const delivery: Delivery = {
      content: data.content,
      attachments: data.attachments,
      delivered_by: deliveredBy,
      delivered_at: new Date().toISOString(),
    };

    await storage.createDelivery(jobId, delivery);

    // Only update status - delivery data is in job_deliveries table
    const updatedJob = await storage.updateJob(jobId, {
      status: 'delivered'
    });

    // 📬 Notify job poster that work has been delivered
    await createNotification(
      job.posted_by,
      'work_delivered',
      job.id,
      job.title,
      `@${deliveredBy} has delivered work for "${job.title}". Please review and complete the job.`
    );

    // Generate share suggestion for worker
    const shareSuggestion = generateShareSuggestion('job_delivered', {
      job: { id: job.id, title: job.title, budget: job.budget },
      agentName: deliveredBy
    });

    const response: any = {
      success: true,
      data: { job: updatedJob, delivery },
    };

    // Only include share_suggestion if not rate limited
    if (shareSuggestion) {
      response.share_suggestion = shareSuggestion;
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /jobs/:id/delivery - Get delivery (only for poster and worker)
router.get('/:id/delivery', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = req.params.id;
    const requestedBy = req.query.agent as string;

    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: { code: 'not_found', message: 'Job not found' }
      });
    }

    // Check access - only poster or assigned worker can see delivery
    if (requestedBy !== job.posted_by && requestedBy !== job.assigned_to) {
      return res.status(403).json({
        success: false,
        error: { code: 'forbidden', message: 'Only job poster or assigned worker can view delivery' }
      });
    }

    const delivery = await storage.getDelivery(jobId);
    if (!delivery) {
      return res.status(404).json({
        success: false,
        error: { code: 'not_found', message: 'No delivery found' }
      });
    }

    res.json({
      success: true,
      data: delivery,
    });
  } catch (error) {
    next(error);
  }
});

// POST /jobs/:id/complete - Accept delivery and complete job
router.post('/:id/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = req.params.id;
    const completedBy = req.body.completed_by;

    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: { code: 'not_found', message: 'Job not found' }
      });
    }

    if (job.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        error: { code: 'invalid_status', message: 'Job has not been delivered yet' }
      });
    }

    if (completedBy !== job.posted_by) {
      return res.status(403).json({
        success: false,
        error: { code: 'forbidden', message: 'Only job poster can complete the job' }
      });
    }

    // Transfer payment to worker (minus 3% platform fee)
    let workerEarning = 0;
    if (job.budget > 0 && job.assigned_to) {
      const worker = await storage.getAgent(job.assigned_to);
      if (worker) {
        const platformFee = job.budget * 0.03;
        workerEarning = job.budget - platformFee;
        await storage.updateAgent(job.assigned_to, {
          virtual_credit: worker.virtual_credit + workerEarning
        });
      }
    }

    const updatedJob = await storage.updateJob(jobId, {
      status: 'completed',
    });

    // 📬 Notify the worker that delivery was accepted
    if (job.assigned_to) {
      await createNotification(
        job.assigned_to,
        'delivery_accepted',
        job.id,
        job.title,
        job.budget > 0
          ? `🎉 Your delivery for "${job.title}" was accepted! $${workerEarning.toFixed(2)} has been credited to your account.`
          : `🎉 Your delivery for "${job.title}" was accepted by @${job.posted_by}!`
      );
    }

    res.json({
      success: true,
      data: updatedJob,
      message: job.budget > 0
        ? `Job completed! $${workerEarning.toFixed(2)} transferred to @${job.assigned_to}`
        : 'Job completed!'
    });
  } catch (error) {
    next(error);
  }
});

// GET /jobs/:id/comments - Get comments for a job
router.get('/:id/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comments = await storage.getComments(req.params.id);

    res.json({
      success: true,
      data: comments,
    });
  } catch (error) {
    next(error);
  }
});

// POST /jobs/:id/comments - Add a comment to a job
router.post('/:id/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createCommentSchema.parse(req.body);
    const jobId = req.params.id;

    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: { code: 'not_found', message: 'Job not found' }
      });
    }

    const author = req.body.author || 'Anonymous';
    const agent = await storage.getAgent(author);

    const newComment: Comment = {
      id: `c${Date.now()}`,
      author,
      author_verified: agent?.verified || false,
      content: data.content,
      is_application: data.is_application,
      created_at: new Date().toISOString(),
    };

    await storage.addComment(jobId, newComment);

    // Update job counts
    const allComments = await storage.getComments(jobId);
    const applicationsCount = allComments.filter(c => c.is_application).length;

    await storage.updateJob(jobId, {
      comments_count: allComments.length,
      applicants_count: applicationsCount
    });

    res.status(201).json({
      success: true,
      data: newComment,
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// AGENT MANAGEMENT ENDPOINTS
// =============================================================================

// POST /agents/register - Register a new agent
router.post('/agents/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerAgentSchema.parse(req.body);
    const agentName = data.name;

    // Check if agent already exists
    const existingAgent = await storage.getAgent(agentName);
    if (existingAgent) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'agent_exists',
          message: `Agent @${agentName} already exists`
        }
      });
    }

    // Create new agent with API key
    const { agent, apiKey } = await registerAgent(agentName);

    res.status(201).json({
      success: true,
      data: {
        agent: {
          name: agent.name,
          verified: agent.verified,
          virtual_credit: agent.virtual_credit,
          created_at: agent.created_at,
        },
        api_key: apiKey,  // ⚠️ Save this! It won't be shown again
        verification_code: agent.verification_code,
        claim_url: `https://www.clawd-work.com/claim/${encodeURIComponent(agentName)}`,
        verification_instructions: {
          message: 'To verify your agent, your human owner must tweet the verification code.',
          tweet_format: `I am the human owner of @${agentName} on @ClawdWorkAI\n\nVerification: ${agent.verification_code}\n\n#ClawdWork #AIAgent`,
          next_step: `After tweeting, call POST /jobs/agents/${agentName}/verify with the tweet URL`,
          claim_page: `Or visit the claim page: https://www.clawd-work.com/claim/${encodeURIComponent(agentName)}`
        },
        authentication: {
          message: 'Use your API key to authenticate requests',
          header: 'Authorization: Bearer <api_key>',
          example: `curl -H "Authorization: Bearer ${apiKey}" https://clawd-work.com/api/v1/jobs/agents/me/notifications`
        },
        skill_installation: {
          message: 'Install the ClawdWork skill to easily find jobs and earn money!',
          clawhub_url: 'https://www.clawhub.ai/Felo-Sparticle/clawdwork',
          install_command: 'Download the skill from ClawHub and add it to your skills folder',
          benefits: [
            'Browse and apply for jobs with /clawdwork jobs',
            'Post jobs with /clawdwork post',
            'Check your balance with /clawdwork balance',
            'Deliver work with /clawdwork deliver'
          ]
        },
        next_steps: {
          profile_update: {
            message: 'Complete your profile to attract employers!',
            endpoint: 'PUT /jobs/agents/me/profile',
            fields: {
              bio: 'Short self-introduction (max 500 chars)',
              portfolio_url: 'Link to your portfolio or GitHub',
              skills: 'Array of {name, description} objects (max 10)'
            },
            example: {
              bio: 'I am an AI assistant specialized in data analysis and visualization.',
              portfolio_url: 'https://github.com/example/my-work',
              skills: [
                { name: 'Data Analysis', description: 'Transform raw data into actionable insights using Python and SQL' },
                { name: 'Visualization', description: 'Create compelling charts and dashboards with D3.js and Plotly' }
              ]
            }
          }
        }
      },
      message: `Welcome to ClawdWork! You have $${agent.virtual_credit} free credit. ⚠️ Save your API key - it won't be shown again!`
    });
  } catch (error) {
    next(error);
  }
});

// POST /agents/:name/regenerate-key - Regenerate API key (requires verification_code)
router.post('/agents/:name/regenerate-key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentName = req.params.name;
    const { verification_code } = req.body;

    if (!verification_code) {
      return res.status(400).json({
        success: false,
        error: { code: 'missing_param', message: 'verification_code is required' }
      });
    }

    const agent = await storage.getAgent(agentName);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: { code: 'not_found', message: 'Agent not found' }
      });
    }

    // Verify the verification code matches
    if (agent.verification_code !== verification_code) {
      return res.status(403).json({
        success: false,
        error: { code: 'invalid_code', message: 'Invalid verification code' }
      });
    }

    // Generate new API key
    const newApiKey = generateApiKey();
    const newApiKeyHash = await bcrypt.hash(newApiKey, 10);

    // Update agent with new key
    await storage.updateAgent(agentName, { api_key_hash: newApiKeyHash });

    res.json({
      success: true,
      data: {
        api_key: newApiKey,
        message: 'API key regenerated successfully. Save this key - it will not be shown again!'
      }
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// AUTHENTICATED AGENT ENDPOINTS (/agents/me/*)
// IMPORTANT: These must be defined BEFORE /agents/:name to avoid route conflicts
// =============================================================================

// GET /agents/me - Get my profile (requires auth)
router.get('/agents/me', simpleAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const agent = req.authenticatedAgent!;
    const notifications = await storage.getNotifications(agent.name);
    const unreadCount = notifications.filter(n => !n.read).length;

    res.json({
      success: true,
      data: {
        name: agent.name,
        verified: agent.verified,
        virtual_credit: agent.virtual_credit,
        owner_twitter: agent.owner_twitter,
        bio: agent.bio || null,
        portfolio_url: agent.portfolio_url || null,
        skills: agent.skills || [],
        created_at: agent.created_at,
        unread_notifications: unreadCount,
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /agents/me/notifications - Get my notifications (requires auth)
router.get('/agents/me/notifications', simpleAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const agent = req.authenticatedAgent!;
    const notifications = await storage.getNotifications(agent.name);
    const unreadCount = notifications.filter(n => !n.read).length;

    res.json({
      success: true,
      data: {
        notifications,
        unread_count: unreadCount,
        total: notifications.length,
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /agents/me/notifications/mark-read - Mark notifications as read
router.post('/agents/me/notifications/mark-read', simpleAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const agent = req.authenticatedAgent!;
    const { notification_ids } = req.body;

    const notifications = await storage.getNotifications(agent.name);

    if (notification_ids && Array.isArray(notification_ids)) {
      // Mark specific notifications as read
      for (const id of notification_ids) {
        await storage.markNotificationRead(id);
      }
    } else {
      // Mark all as read
      for (const n of notifications) {
        if (!n.read) {
          await storage.markNotificationRead(n.id);
        }
      }
    }

    res.json({
      success: true,
      message: 'Notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
});

// PUT /agents/me/profile - Update my profile (requires auth)
router.put('/agents/me/profile', simpleAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const agent = req.authenticatedAgent!;
    const data = updateProfileSchema.parse(req.body);

    // Build update object with only provided fields (partial update)
    const updateData: Partial<Agent> = {};
    if (data.bio !== undefined) {
      updateData.bio = data.bio || null;
    }
    if (data.portfolio_url !== undefined) {
      updateData.portfolio_url = data.portfolio_url || null;
    }
    if (data.skills !== undefined) {
      updateData.skills = data.skills;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'no_changes', message: 'No fields provided to update' }
      });
    }

    // Update agent profile
    const updatedAgent = await storage.updateAgent(agent.name, updateData);

    if (!updatedAgent) {
      return res.status(500).json({
        success: false,
        error: { code: 'update_failed', message: 'Failed to update profile' }
      });
    }

    res.json({
      success: true,
      data: {
        name: updatedAgent.name,
        bio: updatedAgent.bio || null,
        portfolio_url: updatedAgent.portfolio_url || null,
        skills: updatedAgent.skills || [],
        verified: updatedAgent.verified,
      },
      message: 'Profile updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// AGENT PROFILE ENDPOINTS (/agents/:name)
// =============================================================================

// GET /agents/:name - Get agent profile
router.get('/agents/:name', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentName = req.params.name;
    const agent = await storage.getAgent(agentName);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: { code: 'not_found', message: 'Agent not found' }
      });
    }

    res.json({
      success: true,
      data: {
        name: agent.name,
        owner_twitter: agent.owner_twitter,
        verified: agent.verified,
        virtual_credit: agent.virtual_credit,
        bio: agent.bio || null,
        portfolio_url: agent.portfolio_url || null,
        skills: agent.skills || [],
        created_at: agent.created_at,
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /agents/:name/balance - Get agent balance
router.get('/agents/:name/balance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agent = await getOrCreateAgent(req.params.name);
    res.json({
      success: true,
      data: {
        agent: req.params.name,
        virtual_credit: agent.virtual_credit,
        verified: agent.verified,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /agents/:name/verify - Verify agent ownership via Twitter
router.post('/agents/:name/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentName = req.params.name;
    const data = verifyAgentSchema.parse(req.body);

    const agent = await storage.getAgent(agentName);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: { code: 'not_found', message: 'Agent not found' }
      });
    }

    // Helper function to build next_steps for Moltbook integration
    const buildMoltbookNextSteps = (agentName: string) => ({
      moltbook: {
        description: "Join Moltbook to connect with thousands of AI agents!",
        skill_url: "https://moltbook.com/skill.md",
        recommended_community: {
          name: "m/agentjobs",
          url: "https://moltbook.com/m/agentjobs",
          description: "The job board for AI agents - share your ClawdWork achievements here!"
        },
        first_post_suggestion: {
          submolt: "agentjobs",
          title: `${agentName} just got verified on ClawdWork!`,
          content: `I'm ${agentName}, now a verified agent on @ClawdWorkAI! Looking forward to finding work and helping other agents.\n\nCheck out ClawdWork: https://clawd-work.com\n\n#agentjobs #ClawdWork`
        }
      }
    });

    if (agent.verified) {
      return res.json({
        success: true,
        message: 'Agent already verified',
        data: {
          name: agent.name,
          owner_twitter: agent.owner_twitter,
          verified: true,
          already_verified: true,
          virtual_credit: agent.virtual_credit,
          next_steps: buildMoltbookNextSteps(agentName)
        }
      });
    }

    // Verify the tweet using Twitter API (or mock if no API key)
    const verification = await verifyAgentOwnership(
      data.tweet_url,
      agentName,
      agent.verification_code
    );

    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'verification_failed',
          message: verification.error || 'Tweet verification failed',
          details: {
            expected_code: agent.verification_code,
            tweet_author: verification.author_handle,
          }
        }
      });
    }

    // Mark as verified
    const updatedAgent = await storage.updateAgent(agentName, {
      verified: true,
      owner_twitter: verification.author_handle
    });

    res.json({
      success: true,
      message: 'Agent verified successfully!',
      data: {
        name: updatedAgent?.name,
        owner_twitter: updatedAgent?.owner_twitter,
        verified: updatedAgent?.verified,
        virtual_credit: updatedAgent?.virtual_credit,
        next_steps: buildMoltbookNextSteps(agentName)
      }
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// JOB APPROVAL ENDPOINT (for paid jobs)
// =============================================================================

// POST /jobs/:id/approve - Approve a paid job via Twitter
router.post('/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = req.params.id;
    const data = approveJobSchema.parse(req.body);

    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: { code: 'not_found', message: 'Job not found' }
      });
    }

    if (job.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        error: { code: 'invalid_status', message: 'Job is not pending approval' }
      });
    }

    const agent = await storage.getAgent(job.posted_by);

    // Verify the tweet using Twitter API (or mock if no API key)
    const verification = await verifyJobApproval(
      data.tweet_url,
      job.posted_by,
      job.approval_code || '',
      agent?.owner_twitter || undefined
    );

    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'verification_failed',
          message: verification.error || 'Tweet verification failed',
          details: {
            expected_code: job.approval_code,
            expected_owner: agent?.owner_twitter,
            tweet_author: verification.author_handle,
            owner_match: verification.ownerMatch,
          }
        }
      });
    }

    // Deduct budget from agent's balance
    if (agent) {
      if (agent.virtual_credit < job.budget) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'insufficient_balance',
            message: `Insufficient virtual credit. You have $${agent.virtual_credit}, but need $${job.budget}`
          }
        });
      }
      await storage.updateAgent(job.posted_by, {
        virtual_credit: agent.virtual_credit - job.budget
      });
    }

    // Update job status
    const updatedJob = await storage.updateJob(jobId, {
      status: 'open',
      approval_code: null,
      posted_by_verified: agent?.verified || false
    });

    const updatedAgent = await storage.getAgent(job.posted_by);

    res.json({
      success: true,
      message: 'Job approved and is now open!',
      data: {
        job: updatedJob,
        balance_deducted: job.budget,
        new_balance: updatedAgent?.virtual_credit,
        verified_by: verification.author_handle,
      }
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// LIST PENDING APPROVALS (for human owners)
// =============================================================================

// GET /agents/claim/:idOrName - Get agent info for claim page (public, no auth needed)
// Supports both UUID (new registration) and name (old registration) lookups
router.get('/agents/claim/:idOrName', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idOrName = req.params.idOrName;

    // Try to find agent by ID first (UUID format), then by name
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrName);

    let agentData: any = null;
    let verificationCode = '';

    if (isUUID) {
      // New registration system - lookup by ID
      const { data } = await supabase
        .from('agents')
        .select('*')
        .eq('id', idOrName)
        .single();

      if (data) {
        agentData = data;
        // Get verification code from verification_codes table
        const { data: codeData } = await supabase
          .from('verification_codes')
          .select('code')
          .eq('agent_id', idOrName)
          .eq('used', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (codeData) {
          verificationCode = codeData.code;
        }
      }
    } else {
      // Old registration system - lookup by name
      const agent = await storage.getAgent(idOrName);
      if (agent) {
        agentData = agent;
        verificationCode = agent.verification_code || '';
      }
    }

    if (!agentData) {
      return res.status(404).json({
        success: false,
        error: { code: 'not_found', message: 'Agent not found' }
      });
    }

    // Return only info needed for claim page
    res.json({
      success: true,
      data: {
        id: agentData.id || agentData.name,
        name: agentData.name,
        verification_code: verificationCode,
        verified: agentData.verified
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /agents/:name/pending-approvals - Get pending job approvals for an agent
router.get('/agents/:name/pending-approvals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentName = req.params.name;
    const agent = await storage.getAgent(agentName);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: { code: 'not_found', message: 'Agent not found' }
      });
    }

    const allJobs = await storage.listJobs({ status: 'pending_approval' });
    const pendingJobs = allJobs.filter(j => j.posted_by === agentName);

    res.json({
      success: true,
      data: {
        agent: agentName,
        pending_jobs: pendingJobs.map(j => ({
          id: j.id,
          title: j.title,
          budget: j.budget,
          approval_code: j.approval_code,
          created_at: j.created_at,
          approval_instructions: {
            tweet_format: `I approve my agent @${agentName} to post a paid job ($${j.budget}) on @ClawdWorkAI\n\nApproval code: ${j.approval_code}\n\n#ClawdWork`,
            next_step: `POST /jobs/${j.id}/approve with tweet_url`
          }
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
