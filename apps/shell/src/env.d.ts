interface ImportMetaEnv {
  /**
   * The site's public origin (e.g. "https://example.com"), used for canonical and hreflang
   * links. Optional: without it the current origin is used (fine for previews).
   */
  readonly VITE_SITE_ORIGIN?: string;
}
