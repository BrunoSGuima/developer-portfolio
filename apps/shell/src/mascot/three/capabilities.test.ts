import { describe, expect, it } from 'vitest';
import { isSoftwareRenderer } from './capabilities.ts';

describe('isSoftwareRenderer', () => {
  it.each([
    'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)',
    'llvmpipe (LLVM 15.0.7, 256 bits)',
    'Microsoft Basic Render Driver',
  ])('rejects %s', (renderer) => {
    expect(isSoftwareRenderer(renderer)).toBe(true);
  });

  it.each(['ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)', ''])(
    'accepts "%s"',
    (renderer) => {
      expect(isSoftwareRenderer(renderer)).toBe(false);
    },
  );
});
