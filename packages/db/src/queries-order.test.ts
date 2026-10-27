import { describe, it, expect, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { buildSkillCursor, skillQueries } from './queries.js';

type CursorRow = Parameters<typeof buildSkillCursor>[0];

function createOrderCapturingDb() {
  const orderByCalls: SQL[][] = [];
  const whereCalls: SQL[] = [];
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn((condition: SQL) => {
      whereCalls.push(condition);
      return chain;
    }),
    orderBy: vi.fn((...args: SQL[]) => {
      orderByCalls.push(args);
      return chain;
    }),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue([]),
  };

  return {
    db: { select: vi.fn().mockReturnValue(chain) },
    orderByCalls,
    whereCalls,
  };
}

function createRow(overrides: Record<string, unknown> = {}): CursorRow {
  return {
    id: 'test-owner/test-repo/test-skill',
    githubStars: 100,
    downloadCount: 50,
    rating: 4,
    updatedAt: new Date('2026-01-02T03:04:05.000Z'),
    lastDownloadedAt: null,
    latestAiScore: 88,
    reviewStatus: 'ai-reviewed',
    ...overrides,
  } as unknown as CursorRow;
}

const dialect = new PgDialect();
const toSql = (fragment: SQL) => dialect.sqlToQuery(fragment).sql;

describe('search ordering SQL', () => {
  it('sorts by stars with an explicit direction and id tie-breaker', async () => {
    const { db, orderByCalls } = createOrderCapturingDb();

    await skillQueries.search(db as never, { sortBy: 'stars', sortOrder: 'desc' });

    const [primary, secondary, tieBreaker] = orderByCalls[0].map(toSql);
    expect(primary).toContain('github_stars');
    expect(primary).toContain('DESC NULLS FIRST');
    expect(secondary).toContain('download_count');
    expect(tieBreaker).toContain('"skills"."id" ASC NULLS LAST');
  });

  it('sorts by updated ascending with nulls last', async () => {
    const { db, orderByCalls } = createOrderCapturingDb();

    await skillQueries.search(db as never, { sortBy: 'updated', sortOrder: 'asc' });

    const [primary, secondary, tieBreaker] = orderByCalls[0].map(toSql);
    expect(primary).toContain('updated_at');
    expect(primary).toContain('ASC NULLS LAST');
    expect(secondary).toContain('github_stars');
    expect(tieBreaker).toContain('"skills"."id" ASC NULLS LAST');
  });

  it('keeps lastDownloaded rows with null values at the end', async () => {
    const { db, orderByCalls } = createOrderCapturingDb();

    await skillQueries.search(db as never, { sortBy: 'lastDownloaded', sortOrder: 'desc' });

    const [primary, secondary, tieBreaker] = orderByCalls[0].map(toSql);
    expect(primary).toContain('last_downloaded_at');
    expect(primary).toContain('DESC NULLS LAST');
    expect(secondary).toContain('download_count');
    expect(tieBreaker).toContain('"skills"."id" ASC NULLS LAST');
  });

  it('puts recommended skills first, then orders by score and downloads', async () => {
    const { db, orderByCalls } = createOrderCapturingDb();

    await skillQueries.search(db as never, { sortBy: 'recommended', sortOrder: 'desc' });

    const order = orderByCalls[0].map(toSql);
    expect(order).toHaveLength(4);
    expect(order[0]).toContain('CASE WHEN');
    expect(order[0]).toContain('ASC NULLS LAST');
    expect(order[1]).toContain('CASE WHEN');
    expect(order[1]).toContain('DESC NULLS LAST');
    expect(order[2]).toContain('download_count');
    expect(order[3]).toContain('"skills"."id" ASC NULLS LAST');
  });

  it('honors an explicit id sort for full-table scans', async () => {
    const { db, orderByCalls } = createOrderCapturingDb();

    await skillQueries.search(db as never, { sortBy: 'id', sortOrder: 'asc' });

    expect(orderByCalls[0].map(toSql)).toEqual([
      expect.stringContaining('"skills"."id" ASC NULLS LAST'),
    ]);
  });
});

describe('cursor conditions', () => {
  it('continues after a null lastDownloaded value within the null group', async () => {
    const { db, whereCalls } = createOrderCapturingDb();
    const cursor = buildSkillCursor(createRow({ lastDownloadedAt: null }), 'lastDownloaded', 'desc');

    await skillQueries.search(db as never, {
      sortBy: 'lastDownloaded',
      sortOrder: 'desc',
      cursor,
    });

    const whereSql = toSql(whereCalls[0]);
    expect(whereSql).toContain('last_downloaded_at');
    expect(whereSql).toContain('IS NULL');
    expect(whereSql).toContain('download_count');
  });

  it('uses a less-than comparison for a descending numeric cursor', async () => {
    const { db, whereCalls } = createOrderCapturingDb();
    const cursor = buildSkillCursor(createRow({ githubStars: 100 }), 'stars', 'desc');

    await skillQueries.search(db as never, { sortBy: 'stars', sortOrder: 'desc', cursor });

    const whereSql = toSql(whereCalls[0]);
    expect(whereSql).toContain('github_stars');
    expect(whereSql).toContain('<');
  });
});
