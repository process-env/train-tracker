import { NextResponse } from 'next/server';
import { loadRoutes } from '@/lib/mta';

export async function GET() {
  try {
    const { list } = await loadRoutes();
    return NextResponse.json(list);
  } catch (error) {
    console.error('Error loading routes:', error);
    return NextResponse.json(
      { error: 'Failed to load routes' },
      { status: 500 }
    );
  }
}
