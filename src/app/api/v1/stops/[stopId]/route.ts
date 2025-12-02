import { NextRequest, NextResponse } from 'next/server';
import { getStop } from '@/lib/mta';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stopId: string }> }
) {
  try {
    const { stopId } = await params;

    const stop = await getStop(stopId);

    if (!stop) {
      return NextResponse.json({ error: 'Stop not found' }, { status: 404 });
    }

    return NextResponse.json(stop);
  } catch (error) {
    console.error('Error getting stop:', error);
    return NextResponse.json(
      { error: 'Failed to get stop' },
      { status: 500 }
    );
  }
}
