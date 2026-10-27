import { describe, expect, it } from 'vitest';
import { buildSkillCursor, parseSkillCursor } from './queries.js';

type CursorRow = Parameters<typeof buildSkillCursor>[0];

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

describe('skill cursors', () => {
  it('round-trips the active sort and key values', () => {
    const cursor = buildSkillCursor(createRow(), 'stars', 'desc');
    const parsed = parseSkillCursor(cursor);

    expect(parsed.sortBy).toBe('stars');
    expect(parsed.sortOrder).toBe('desc');
    expect(parsed.keys).toEqual([100, 50, 'test-owner/test-repo/test-skill']);
  });

  it('serializes timestamps as epoch milliseconds', () => {
    const row = createRow();
    const parsed = parseSkillCursor(buildSkillCursor(row, 'updated', 'desc'));

    expect(parsed.keys).toEqual([
      row.updatedAt.getTime(),
      row.githubStars,
      row.id,
    ]);
  });

  it('keeps null sort values in the cursor', () => {
    const parsed = parseSkillCursor(
      buildSkillCursor(createRow({ lastDownloadedAt: null }), 'lastDownloaded', 'desc')
    );

    expect(parsed.keys).toEqual([null, 50, 'test-owner/test-repo/test-skill']);
  });

  it('supports an explicit id sort for stable full-table scans', () => {
    const parsed = parseSkillCursor(buildSkillCursor(createRow(), 'id', 'asc'));

    expect(parsed.sortBy).toBe('id');
    expect(parsed.sortOrder).toBe('asc');
    expect(parsed.keys).toEqual(['test-owner/test-repo/test-skill']);
  });

  it('encodes the recommended ranking keys', () => {
    const recommended = parseSkillCursor(buildSkillCursor(createRow(), 'recommended', 'desc'));
    expect(recommended.keys).toEqual([0, 88, 50, 'test-owner/test-repo/test-skill']);

    const other = parseSkillCursor(
      buildSkillCursor(createRow({ reviewStatus: 'unreviewed' }), 'recommended', 'desc')
    );
    expect(other.keys).toEqual([1, 0, 50, 'test-owner/test-repo/test-skill']);
  });

  it('rejects malformed cursors', () => {
    expect(() => parseSkillCursor('not-a-cursor')).toThrow('Invalid cursor');
    expect(() => parseSkillCursor(Buffer.from('{"v":2}').toString('base64url'))).toThrow(
      'Unsupported cursor version'
    );
    expect(() =>
      parseSkillCursor(Buffer.from('{"v":1,"sortBy":"stars","sortOrder":"desc","keys":[]}').toString('base64url'))
    ).toThrow('Invalid cursor');
  });
});
