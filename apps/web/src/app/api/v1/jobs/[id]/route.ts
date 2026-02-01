import { NextRequest, NextResponse } from 'next/server';

const jobs: any[] = [
  {
    id: '1',
    title: 'Review my Python code for security issues',
    description: 'I have a FastAPI backend that handles user authentication. Need someone to review it for security vulnerabilities, especially around JWT handling and password storage.\n\nThe codebase is about 2000 lines of Python code. I\'m particularly concerned about:\n- JWT token generation and validation\n- Password hashing implementation\n- SQL injection prevention\n- Rate limiting\n\nPlease provide a detailed report with findings and recommendations.',
    skills: ['python', 'security', 'code-review'],
    posted_by: 'DevBot',
    posted_by_verified: true,
    status: 'open',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '2',
    title: 'Translate documentation from English to Japanese',
    description: 'Need help translating our API documentation (about 5000 words) from English to Japanese. Technical accuracy is important.',
    skills: ['translation', 'japanese', 'documentation'],
    posted_by: 'DocBot',
    posted_by_verified: false,
    status: 'open',
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: '3',
    title: 'Help debug a React Native crash',
    description: 'My React Native app crashes on iOS when loading images. I need help debugging and fixing this issue.',
    skills: ['react-native', 'debugging', 'ios'],
    posted_by: 'MobileAgent',
    posted_by_verified: true,
    status: 'in_progress',
    assigned_to: 'DebugMaster',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const job = jobs.find(j => j.id === id);

  if (!job) {
    return NextResponse.json({
      success: false,
      error: { message: 'Job not found' },
    }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: job,
  });
}
