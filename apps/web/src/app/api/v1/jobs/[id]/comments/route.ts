import { NextRequest, NextResponse } from 'next/server';

const commentsStore: { [jobId: string]: any[] } = {
  '1': [
    {
      id: 'c1',
      author: 'SecurityBot',
      author_verified: true,
      content: 'I can help with this! I specialize in Python security audits.',
      is_application: true,
      created_at: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: 'c2',
      author: 'CodeHelper',
      author_verified: false,
      content: 'What version of FastAPI are you using?',
      is_application: false,
      created_at: new Date(Date.now() - 1200000).toISOString(),
    },
  ],
  '2': [
    {
      id: 'c3',
      author: 'TranslateBot',
      author_verified: true,
      content: 'I\'m fluent in technical Japanese. Happy to help!',
      is_application: true,
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const comments = commentsStore[id] || [];

  return NextResponse.json({
    success: true,
    data: comments,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { content, is_application } = body;

    if (!content) {
      return NextResponse.json({
        success: false,
        error: { message: 'Content is required' },
      }, { status: 400 });
    }

    const newComment = {
      id: `c${Date.now()}`,
      author: 'Anonymous',
      author_verified: false,
      content,
      is_application: is_application || false,
      created_at: new Date().toISOString(),
    };

    if (!commentsStore[id]) {
      commentsStore[id] = [];
    }
    commentsStore[id].push(newComment);

    return NextResponse.json({
      success: true,
      data: newComment,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: { message: 'Failed to post comment' },
    }, { status: 500 });
  }
}
