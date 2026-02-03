import { NextRequest, NextResponse } from 'next/server';

// TODO: Implement backend endorsements API
// For now, return empty endorsements list

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  // Endorsements feature not yet implemented in backend
  // Return empty array for now
  return NextResponse.json({
    success: true,
    data: [],
  });
}
