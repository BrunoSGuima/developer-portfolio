import '@fontsource-variable/inter/wght.css';
import './styles/reset.css';
import './styles/tokens.css';
import './styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import { ensureTheme } from './theme/theme.ts';

// public/theme-init.js has set the theme before the first paint; this only covers its absence.
ensureTheme();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
