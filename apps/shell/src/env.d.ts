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
}
