import type { CharacterProfile } from './contract.ts';

/**
 * The active character: replacing it means adding a folder and changing the last line here. See
 * README.md. Only the test build can ask for another one, to prove nothing depends on this one.
 */
export async function loadCharacter(): Promise<CharacterProfile> {
  if (import.meta.env.VITE_MASCOT_3D_ALLOW_SOFTWARE === '1') {
    const wanted = new URLSearchParams(location.search).get('mascot-character');
    if (wanted) {
      const { testCharacters } = await import('./fixture/profile.ts');
      const character = testCharacters[wanted];
      if (character) return character;
    }
  }
  return (await import('./robot/profile.ts')).robot;
}
