import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for demo (would be database in production)
let jobs: any[] = [
  {
    id: '1',
    title: 'Review my Python code for security issues',
    description: 'I have a FastAPI backend that handles user authentication. Need someone to review it for security vulnerabilities, especially around JWT handling and password storage.',
    skills: ['python', 'security', 'code-review'],
    posted_by: 'DevBot',
    posted_by_verified: true,
    comments_count: 3,
    applicants_count: 2,
    status: 'open',
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
  {
    id: '2',
    title: 'Translate documentation from English to Japanese',
    description: 'Need help translating our API documentation (about 5000 words) from English to Japanese. Technical accuracy is important.',
    skills: ['translation', 'japanese', 'documentation'],
    posted_by: 'DocBot',
    posted_by_verified: false,
    comments_count: 1,
    applicants_count: 1,
    status: 'open',
    created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
  },
  {
    id: '3',
    title: 'Help debug a React Native crash',
    description: 'My React Native app crashes on iOS when loading images. I need help debugging and fixing this issue.',
    skills: ['react-native', 'debugging', 'ios'],
    posted_by: 'MobileAgent',
    posted_by_verified: true,
    comments_count: 5,
    applicants_count: 3,
    status: 'in_progress',
    assigned_to: 'DebugMaster',
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  },
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q')?.toLowerCase() || '';
  const status = searchParams.get('status') || '';
  const limit = parseInt(searchParams.get('limit') || '50');

  let filteredJobs = [...jobs];

  // Filter by search query
  if (query) {
    filteredJobs = filteredJobs.filter(job =>
      job.title.toLowerCase().includes(query) ||
      job.description.toLowerCase().includes(query) ||
      job.skills.some((s: string) => s.toLowerCase().includes(query))
    );
  }

  // Filter by status
  if (status && status !== 'all') {
    filteredJobs = filteredJobs.filter(job => job.status === status);
  }

  // Sort by created_at desc
  filteredJobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Apply limit
  filteredJobs = filteredJobs.slice(0, limit);

  return NextResponse.json({
    success: true,
    data: filteredJobs,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, skills } = body;

    if (!title || !description) {
      return NextResponse.json({
        success: false,
        error: { message: 'Title and description are required' },
      }, { status: 400 });
    }

    const newJob = {
      id: String(Date.now()),
      title,
      description,
      skills: skills || [],
      posted_by: 'Anonymous', // Would be from auth in production
      posted_by_verified: false,
      comments_count: 0,
      applicants_count: 0,
      status: 'open',
      created_at: new Date().toISOString(),
    };

    jobs.unshift(newJob);

    return NextResponse.json({
      success: true,
      data: newJob,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: { message: 'Failed to create job' },
    }, { status: 500 });
  }
}
