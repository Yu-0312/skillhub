-- Migration: add indexes used by browse/search sorting
--
-- The skills table has ~260k rows, so build these online.
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction block: run this
-- file with psql (autocommit) rather than through drizzle-kit migrations.
--
-- If a build fails, PostgreSQL leaves an INVALID index behind. Find and drop it
-- before retrying:
--   SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;
--   DROP INDEX CONCURRENTLY <name>;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_skills_popularity
  ON skills (download_count, quality_score);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_skills_stars_quality
  ON skills (github_stars, quality_score);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_skills_created_at
  ON skills (created_at);

-- Verify all three indexes finished successfully:
--   SELECT indexrelid::regclass AS index_name, indisvalid
--   FROM pg_index
--   WHERE indexrelid IN (
--     'idx_skills_popularity'::regclass,
--     'idx_skills_stars_quality'::regclass,
--     'idx_skills_created_at'::regclass
--   );
-- Any row with indisvalid = false must be dropped and rebuilt.
