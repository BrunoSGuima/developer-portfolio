import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LOCALES } from '../../i18n/locales.ts';
import { mascotFactFor, mascotFacts } from './funFacts.ts';

const FOLDER = 'src/mascot/three/character/bruno';

function glbJson() {
  const data = readFileSync(`${FOLDER}/bruno.glb`);
  return JSON.parse(data.toString('utf8', 20, 20 + data.readUInt32LE(12))) as {
    skins: { joints: unknown[] }[];
    animations: { name: string }[];
  };
}

describe('what the mascot facts claim is what the model is', () => {
  const english = mascotFacts.map((fact) => fact.text.en).join(' ');
  const portuguese = mascotFacts.map((fact) => fact.text['pt-BR']).join(' ');

  it('the skeleton', () => {
    const bones = glbJson().skins[0]!.joints.length;
    expect(english).toContain(`${bones}-bone`);
    expect(portuguese).toContain(`${bones} ossos`);
  });

  it('the clips', () => {
    const clips = glbJson().animations.map((clip) => clip.name);
    expect(clips).toEqual(['Idle', 'Walk', 'Run', 'Jump', 'Sit', 'PointL', 'PointR']);
    expect(clips).toHaveLength(7);
    expect(english).toContain('seven animation clips');
    expect(portuguese).toContain('sete animações');
  });

  it('the size, model and texture together', () => {
    const bytes = statSync(`${FOLDER}/bruno.glb`).size + statSync(`${FOLDER}/base.webp`).size;
    expect(Math.round(bytes / 1024)).toBe(225);
    expect(english).toContain('about 225 KB');
    expect(portuguese).toContain('cerca de 225 KB');
  });
});

describe('the mascot facts', () => {
  it('are complete in every language', () => {
    for (const fact of mascotFacts) {
      for (const locale of LOCALES) {
        expect(fact.title[locale].trim()).not.toBe('');
        expect(fact.text[locale].trim()).not.toBe('');
        for (const tag of fact.tags) expect(tag.label[locale].trim()).not.toBe('');
      }
      expect(fact.text['pt-BR']).not.toBe(fact.text.en);
      expect(fact.title['pt-BR']).not.toBe(fact.title.en);
    }
  });

  it('each belongs to one page', () => {
    expect(mascotFactFor('about')).toBe(mascotFacts[0]);
    expect(mascotFactFor('architecture')).toBe(mascotFacts[1]);
    expect(mascotFacts).toHaveLength(2);
  });

  it('no other page has one', () => {
    for (const sectionId of ['home', 'projects', 'contact', 'anything-else', undefined]) {
      expect(mascotFactFor(sectionId)).toBeNull();
    }
  });
});
