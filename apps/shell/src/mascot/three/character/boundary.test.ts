import { describe, expect, it } from 'vitest';
import { robot } from './robot/profile.ts';

// Behaviour code: everything in mascot/three except the character folder and tests.
const sources = import.meta.glob<string>(['../*.ts', '../*.tsx', '../*.css', '!../*.test.*'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

const quoted = (name: string) => new RegExp(`['"\`]${name}['"\`]`);

describe('behaviour code knows nothing about the active character', () => {
  it('finds the files it is checking', () => {
    expect(Object.keys(sources).length).toBeGreaterThanOrEqual(10);
  });

  it.each(Object.keys(sources))('%s names none of its clips or nodes', (file) => {
    const source = sources[file] ?? '';
    for (const name of [...robot.requiredClips, ...robot.requiredNodes]) {
      expect(source).not.toMatch(quoted(name));
    }
    // Template-built node names, like the arms'
    expect(source).not.toMatch(/UpperArm|LowerArm|UpperLeg|LowerLeg|Palm2|Middle1|Index2|Thumb2/);
  });

  it.each(Object.keys(sources))('%s holds none of its measurements', (file) => {
    const source = sources[file] ?? '';
    for (const [name, value] of Object.entries(robot.metrics)) {
      // Whole or simple numbers mean too many other things to search for, like 0.08 seconds.
      if (name !== 'sitBulge' && String(value).length >= 4) {
        expect(source).not.toContain(String(value));
      }
    }
    for (const value of Object.values(robot.jump)) {
      if (String(value).length >= 4) expect(source).not.toContain(String(value));
    }
  });

  it.each(Object.keys(sources))('%s never reaches into a character’s folder', (file) => {
    expect(sources[file]).not.toMatch(/character\/(robot|fixture)|RobotExpressive/);
  });
});
