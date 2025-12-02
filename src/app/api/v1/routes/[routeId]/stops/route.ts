import { NextRequest, NextResponse } from 'next/server';
import { loadStops, filterStopsByRoute } from '@/lib/mta';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ routeId: string }> }
) {
  try {
    const { routeId } = await params;

    if (!routeId) {
      return NextResponse.json(
        { error: 'Route ID is required' },
        { status: 400 }
      );
    }

    const { list } = await loadStops();
    const filtered = filterStopsByRoute(list, routeId);

    // Sort alphabetically by name, then by ID
    filtered.sort((a, b) => {
      const nameCompare = a.name.localeCompare(b.name);
      if (nameCompare !== 0) return nameCompare;
      return a.id.localeCompare(b.id);
    });

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Error loading stops for route:', error);
    return NextResponse.json(
      { error: 'Failed to load stops' },
      { status: 500 }
    );
  }
}
