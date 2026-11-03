// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { checkModel } from '../../../../scripts/check-mascot-model.mjs';
import { missingFromModel } from './validate.ts';

const PROFILE = { requiredClips: ['Idle', 'Walk'], requiredNodes: ['Spine'] };

describe('missingFromModel', () => {
  it('finds nothing when the model has everything', () => {
    const model = { clipNames: ['Idle', 'Walk', 'Extra'], nodeNames: ['Spine', 'Extra'] };
    expect(missingFromModel(PROFILE, model)).toEqual([]);
  });

  it('names what is missing', () => {
    expect(missingFromModel(PROFILE, { clipNames: ['Idle'], nodeNames: [] })).toEqual([
      'clip Walk',
      'node Spine',
    ]);
  });
});

describe('the model check', () => {
  const model = (gltf: object, size = 1000) => ({ size, gltf });

  it('passes a clean model', () => {
    const clean = model({ animations: [{ name: 'Idle' }] });
    expect(checkModel(clean, ['Idle'])).toMatchObject({ problems: [], warnings: [] });
  });

  it('fails on an embedded image, which the CSP blocks', () => {
    expect(checkModel(model({ images: [{ bufferView: 0 }] })).problems).toHaveLength(1);
    expect(
      checkModel(model({ images: [{ uri: 'data:image/png;base64,x' }] })).problems,
    ).toHaveLength(1);
  });

  it('allows a separate same-origin image', () => {
    expect(checkModel(model({ images: [{ uri: 'body.webp' }] })).problems).toEqual([]);
  });

  it.each(['KHR_draco_mesh_compression', 'KHR_texture_basisu', 'EXT_meshopt_compression'])(
    'fails on %s, whose decoder the CSP blocks',
    (name) => {
      expect(checkModel(model({ extensionsUsed: [name] })).problems).toHaveLength(1);
    },
  );

  it('fails on a missing required clip', () => {
    expect(checkModel(model({ animations: [] }), ['Idle']).problems).toEqual([
      'Missing clip: Idle.',
    ]);
  });

  it('only warns over the size targets: they are not artistic limits', () => {
    const big = checkModel(
      model(
        {
          skins: [{ joints: Array.from({ length: 40 }) }],
          accessors: [{ count: 60_000 }],
          meshes: [{ primitives: [{ indices: 0, attributes: { POSITION: 0 } }] }],
        },
        500 * 1024,
      ),
    );
    expect(big.problems).toEqual([]);
    expect(big.warnings).toHaveLength(3);
  });

  function run(file: string) {
    return spawnSync(process.execPath, ['apps/shell/scripts/check-mascot-model.mjs', file], {
      cwd: new URL('../../../../../../', import.meta.url).pathname,
      encoding: 'utf8',
    });
  }

  it('the character himself passes cleanly', () => {
    const result = run('apps/shell/src/mascot/three/character/bruno/bruno.glb');
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('the test character passes cleanly', () => {
    const result = run('apps/shell/src/mascot/three/character/fixture/fixture.glb');
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('a file that is not a model fails clearly', () => {
    expect(run('package.json').status).not.toBe(0);
  });
});
