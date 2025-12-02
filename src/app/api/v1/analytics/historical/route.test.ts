import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Note: This route uses dynamic import (`await import('@/lib/db')`)
// which is difficult to mock properly. We test what we can:
// - Validation logic (hours parameter)
// - Error responses

describe('GET /api/v1/analytics/historical', () => {
  describe('input validation', () => {
    // Import the route handler dynamically in each test
    it('returns 400 for hours > 168', async () => {
      // Create the mock db
      const mockDb = {
        trainSnapshot: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
          findFirst: vi.fn().mockResolvedValue(null),
          groupBy: vi.fn().mockResolvedValue([]),
        },
        arrivalEvent: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
        alertLog: { count: vi.fn().mockResolvedValue(0) },
        feedPollLog: { findFirst: vi.fn().mockResolvedValue(null) },
      };

      vi.doMock('@/lib/db', () => ({ db: mockDb }));

      const { GET } = await import('./route');
      const request = new NextRequest('http://localhost/api/v1/analytics/historical?hours=200');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();

      vi.doUnmock('@/lib/db');
    });

    it('returns 400 for hours < 1', async () => {
      const mockDb = {
        trainSnapshot: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
          findFirst: vi.fn().mockResolvedValue(null),
          groupBy: vi.fn().mockResolvedValue([]),
        },
        arrivalEvent: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
        alertLog: { count: vi.fn().mockResolvedValue(0) },
        feedPollLog: { findFirst: vi.fn().mockResolvedValue(null) },
      };

      vi.doMock('@/lib/db', () => ({ db: mockDb }));

      const { GET } = await import('./route');
      const request = new NextRequest('http://localhost/api/v1/analytics/historical?hours=0');
      const response = await GET(request);

      expect(response.status).toBe(400);

      vi.doUnmock('@/lib/db');
    });

    it('returns 400 for negative hours', async () => {
      const mockDb = {
        trainSnapshot: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
          findFirst: vi.fn().mockResolvedValue(null),
          groupBy: vi.fn().mockResolvedValue([]),
        },
        arrivalEvent: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
        alertLog: { count: vi.fn().mockResolvedValue(0) },
        feedPollLog: { findFirst: vi.fn().mockResolvedValue(null) },
      };

      vi.doMock('@/lib/db', () => ({ db: mockDb }));

      const { GET } = await import('./route');
      const request = new NextRequest('http://localhost/api/v1/analytics/historical?hours=-5');
      const response = await GET(request);

      expect(response.status).toBe(400);

      vi.doUnmock('@/lib/db');
    });

    it('returns 400 for non-numeric hours', async () => {
      const mockDb = {
        trainSnapshot: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
          findFirst: vi.fn().mockResolvedValue(null),
          groupBy: vi.fn().mockResolvedValue([]),
        },
        arrivalEvent: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
        alertLog: { count: vi.fn().mockResolvedValue(0) },
        feedPollLog: { findFirst: vi.fn().mockResolvedValue(null) },
      };

      vi.doMock('@/lib/db', () => ({ db: mockDb }));

      const { GET } = await import('./route');
      const request = new NextRequest('http://localhost/api/v1/analytics/historical?hours=abc');
      const response = await GET(request);

      expect(response.status).toBe(400);

      vi.doUnmock('@/lib/db');
    });

    it('accepts valid hours value of 24', async () => {
      const mockDb = {
        trainSnapshot: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
          findFirst: vi.fn().mockResolvedValue(null),
          groupBy: vi.fn().mockResolvedValue([]),
        },
        arrivalEvent: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
        alertLog: { count: vi.fn().mockResolvedValue(0) },
        feedPollLog: { findFirst: vi.fn().mockResolvedValue(null) },
      };

      vi.doMock('@/lib/db', () => ({ db: mockDb }));

      const { GET } = await import('./route');
      const request = new NextRequest('http://localhost/api/v1/analytics/historical?hours=24');
      const response = await GET(request);

      // Should not return validation error
      expect(response.status).not.toBe(400);

      vi.doUnmock('@/lib/db');
    });

    it('accepts valid hours value of 168', async () => {
      const mockDb = {
        trainSnapshot: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
          findFirst: vi.fn().mockResolvedValue(null),
          groupBy: vi.fn().mockResolvedValue([]),
        },
        arrivalEvent: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
        alertLog: { count: vi.fn().mockResolvedValue(0) },
        feedPollLog: { findFirst: vi.fn().mockResolvedValue(null) },
      };

      vi.doMock('@/lib/db', () => ({ db: mockDb }));

      const { GET } = await import('./route');
      const request = new NextRequest('http://localhost/api/v1/analytics/historical?hours=168');
      const response = await GET(request);

      expect(response.status).not.toBe(400);

      vi.doUnmock('@/lib/db');
    });

    it('requires hours parameter (no default)', async () => {
      const mockDb = {
        trainSnapshot: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
          findFirst: vi.fn().mockResolvedValue(null),
          groupBy: vi.fn().mockResolvedValue([]),
        },
        arrivalEvent: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
        alertLog: { count: vi.fn().mockResolvedValue(0) },
        feedPollLog: { findFirst: vi.fn().mockResolvedValue(null) },
      };

      vi.doMock('@/lib/db', () => ({ db: mockDb }));

      const { GET } = await import('./route');
      const request = new NextRequest('http://localhost/api/v1/analytics/historical');
      const response = await GET(request);

      // Without hours param, validation returns 400 (schema doesn't accept null)
      expect(response.status).toBe(400);

      vi.doUnmock('@/lib/db');
    });
  });
});
