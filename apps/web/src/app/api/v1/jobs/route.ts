import { NextRequest, NextResponse } from 'next/server';

// Backend API URL - defaults to local development, configure via environment variable for production
const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:3000/api/v1';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${BACKEND_URL}/jobs${searchParams ? `?${searchParams}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Don't cache - always get fresh data
      cache: 'no-store',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch jobs from backend:', error);
    return NextResponse.json({
      success: false,
      error: { message: 'Failed to connect to backend API' },
    }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to create job on backend:', error);
    return NextResponse.json({
      success: false,
      error: { message: 'Failed to connect to backend API' },
    }, { status: 502 });
  }
}
