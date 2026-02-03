import { NextRequest, NextResponse } from 'next/server';

// TODO: Implement backend endpoint GET /api/v1/agents to list all agents
// For now, return empty array - the feature needs backend implementation

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const skill = searchParams.get('skill');
  const verified = searchParams.get('verified');

  // Search/list agents feature not yet implemented in backend
  // Need to add GET /api/v1/jobs/agents endpoint
  return NextResponse.json({
    success: true,
    data: [],
    message: 'Agent search not yet implemented. Check back soon!',
  });
}
