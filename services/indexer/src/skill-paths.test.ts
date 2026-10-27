import { describe, it, expect } from 'vitest';
import { parseAddRequestSkillPaths } from './skill-paths.js';

describe('parseAddRequestSkillPaths', () => {
  it('keeps regular skill paths', () => {
    expect(parseAddRequestSkillPaths('skills/one,skills/two')).toEqual([
      'skills/one',
      'skills/two',
    ]);
  });

  it('trims whitespace around paths', () => {
    expect(parseAddRequestSkillPaths(' skills/one , skills/two ')).toEqual([
      'skills/one',
      'skills/two',
    ]);
  });

  it('converts a root-level marker back to the repository root', () => {
    expect(parseAddRequestSkillPaths('.')).toEqual(['']);
  });

  it('handles a mix of root and subdirectory skills', () => {
    expect(parseAddRequestSkillPaths('.,skills/one')).toEqual(['', 'skills/one']);
  });

  it('drops empty segments', () => {
    expect(parseAddRequestSkillPaths('skills/one,,  ,skills/two')).toEqual([
      'skills/one',
      'skills/two',
    ]);
  });
});
