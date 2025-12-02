import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';
import { createMockFeedEntity } from '@/test/factories';

// Mock the MTA lib
vi.mock('@/lib/mta', () => ({
  fetchFeed: vi.fn(),
}));

import { fetchFeed } from '@/lib/mta';

describe('GET /api/v1/feed/[groupId]', () => {
  const mockFeed = {
    timestamp: new Date().toISOString(),
    entities: [
      createMockFeedEntity({ routeId: 'A' }),
      createMockFeedEntity({ routeId: 'C' }),
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (fetchFeed as any).mockResolvedValue(mockFeed);
  });

  it('returns feed data for valid group ID', async () => {
    const request = new NextRequest('http://localhost/api/v1/feed/ACE');
    const response = await GET(request, { params: Promise.resolve({ groupId: 'ACE' }) });
    const data = await response.json();

    expect(data.entities).toHaveLength(2);
    expect(fetchFeed).toHaveBeenCalledWith('ACE', { useCache: true });
  });

  it('accepts all valid feed group IDs', async () => {
    const validGroups = ['ACE', 'BDFM', 'G', 'JZ', 'NQRW', 'L', 'SI', '1234567'];

    for (const groupId of validGroups) {
      (fetchFeed as any).mockResolvedValue(mockFeed);
      const request = new NextRequest(`http://localhost/api/v1/feed/${groupId}`);
      const response = await GET(request, { params: Promise.resolve({ groupId }) });

      expect(response.status).toBe(200);
    }
  });

  it('returns 400 for invalid feed group ID', async () => {
    const request = new NextRequest('http://localhost/api/v1/feed/INVALID');
    const response = await GET(request, { params: Promise.resolve({ groupId: 'INVALID' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid feed group ID');
  });

  it('bypasses cache when nocache=true', async () => {
    const request = new NextRequest('http://localhost/api/v1/feed/ACE?nocache=true');
    await GET(request, { params: Promise.resolve({ groupId: 'ACE' }) });

    expect(fetchFeed).toHaveBeenCalledWith('ACE', { useCache: false });
  });

  it('uses cache by default', async () => {
    const request = new NextRequest('http://localhost/api/v1/feed/ACE');
    await GET(request, { params: Promise.resolve({ groupId: 'ACE' }) });

    expect(fetchFeed).toHaveBeenCalledWith('ACE', { useCache: true });
  });

  it('returns 500 on fetch error', async () => {
    (fetchFeed as any).mockRejectedValue(new Error('MTA API Error'));

    const request = new NextRequest('http://localhost/api/v1/feed/ACE');
    const response = await GET(request, { params: Promise.resolve({ groupId: 'ACE' }) });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('MTA API Error');
  });

  it('handles non-Error thrown values', async () => {
    (fetchFeed as any).mockRejectedValue('string error');

    const request = new NextRequest('http://localhost/api/v1/feed/ACE');
    const response = await GET(request, { params: Promise.resolve({ groupId: 'ACE' }) });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch feed');
  });

  it('returns 400 for empty group ID', async () => {
    const request = new NextRequest('http://localhost/api/v1/feed/');
    const response = await GET(request, { params: Promise.resolve({ groupId: '' }) });

    expect(response.status).toBe(400);
  });
});
