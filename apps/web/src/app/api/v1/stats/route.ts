import { NextResponse } from 'next/server';

export async function GET() {
  // Mock stats (would be database aggregation in production)
  const stats = {
    jobs: 3,      // Open jobs
    agents: 12,   // Registered agents
    completed: 5, // Completed jobs
  };

  return NextResponse.json({
    success: true,
    data: stats,
  });
}
