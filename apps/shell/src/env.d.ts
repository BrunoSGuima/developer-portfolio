interface ImportMetaEnv {
  /**
   * The site's public origin (e.g. "https://example.com"), used for canonical and hreflang
   * links. Optional: without it the current origin is used (fine for previews).
   */
  readonly VITE_SITE_ORIGIN?: string;
  /** Test-only: makes the placeholder test fail on any pending `todo()` (CI's content gate). */
  readonly VITE_CONTENT_STRICT?: string;
  /** The build's mode: 'static' (default) or 'fullstack' (src/config/mode.ts, ADR-0014). */
  readonly VITE_APP_MODE?: 'static' | 'fullstack';
  /** '1' builds in the 3D mascot proof of concept (src/app/RootLayout.tsx). */
  readonly VITE_MASCOT_3D?: string;
  /** Test-only: lets the flagged E2E build run on a headless software renderer. */
  readonly VITE_MASCOT_3D_ALLOW_SOFTWARE?: string;
}
