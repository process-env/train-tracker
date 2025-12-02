import { NextRequest, NextResponse } from 'next/server';
import { searchStops } from '@/lib/mta';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || undefined;
    const route = searchParams.get('route') || undefined;

    const stops = await searchStops(query, route);

    return NextResponse.json(stops);
  } catch (error) {
    console.error('Error searching stops:', error);
    return NextResponse.json(
      { error: 'Failed to search stops' },
      { status: 500 }
    );
  }
}
