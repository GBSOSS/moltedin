import { NextResponse } from 'next/server';

// Backend API URL - defaults to local development, configure via environment variable for production
const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:3000/api/v1';

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch stats from backend:', error);
    return NextResponse.json({
      success: false,
      error: { message: 'Failed to connect to backend API' },
    }, { status: 502 });
  }
}
