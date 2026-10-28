// Sets the theme before the first paint (Step 4.6a, ADR-0017): the visitor's stored choice, else
// the system preference. A classic, blocking script from the same origin, because the Content
// Security Policy allows no inline script. Keep in step with src/theme/theme.ts
// (theme.test.ts checks the key, the values and the colours).
(function () {
  var root = document.documentElement;
  var theme = 'light';
  try {
    var stored = window.localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      theme = stored;
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme = 'dark';
    }
  } catch {
    try {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) theme = 'dark';
    } catch {
      // No storage and no media queries: the light theme.
    }
  }
  root.dataset.theme = theme;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#161e30' : '#fcf5ed');
})();
