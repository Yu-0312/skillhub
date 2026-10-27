import { describe, it, expect, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import { addRequestQueries } from './queries.js';

function createWhereCapturingDb() {
  const where = vi.fn();
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn((condition: unknown) => {
      where(condition);
      return chain;
    }),
    orderBy: vi.fn().mockResolvedValue([]),
  };

  return {
    db: { select: vi.fn().mockReturnValue(chain) },
    where,
  };
}

describe('addRequestQueries.getIndexable', () => {
  it('selects pending and approved requests', async () => {
    const { db, where } = createWhereCapturingDb();

    await addRequestQueries.getIndexable(db as never);

    const query = new PgDialect().sqlToQuery(where.mock.calls[0][0]);
    expect(query.sql).toContain('"add_requests"."status" in');
    expect(query.params).toEqual(expect.arrayContaining(['pending', 'approved']));
  });

  it('excludes approved requests that already failed', async () => {
    const { db, where } = createWhereCapturingDb();

    await addRequestQueries.getIndexable(db as never);

    const query = new PgDialect().sqlToQuery(where.mock.calls[0][0]);
    expect(query.sql).toContain('"add_requests"."error_message" is null');
    expect(query.sql).toContain(' or ');
  });
});
