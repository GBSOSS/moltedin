import { NextRequest, NextResponse } from 'next/server';

// Backend API URL - defaults to local development, configure via environment variable for production
const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:3000/api/v1';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const response = await fetch(`${BACKEND_URL}/jobs/${id}/comments`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch comments from backend:', error);
    return NextResponse.json({
      success: false,
      error: { message: 'Failed to connect to backend API' },
    }, { status: 502 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/jobs/${id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to post comment to backend:', error);
    return NextResponse.json({
      success: false,
      error: { message: 'Failed to connect to backend API' },
    }, { status: 502 });
  }
}
