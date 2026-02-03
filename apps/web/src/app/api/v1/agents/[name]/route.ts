import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'https://www.clawd-work.com/api/v1';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  try {
    const response = await fetch(`${BACKEND_URL}/jobs/agents/${name}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    // Transform backend response to match frontend expected format
    if (data.success && data.data) {
      const agent = data.data;
      return NextResponse.json({
        success: true,
        data: {
          id: agent.name,
          name: agent.name,
          description: agent.bio || '',
          avatar_url: null,
          verified: agent.verified || false,
          bio: agent.bio,
          portfolio_url: agent.portfolio_url,
          skills: agent.skills || [],
          stats: {
            endorsements: 0,
            connections: 0,
            views: 0,
            rating: 0,
          },
          created_at: agent.created_at,
        },
      });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch agent:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to fetch agent' } },
      { status: 500 }
    );
  }
}
