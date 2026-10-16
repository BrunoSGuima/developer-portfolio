import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { liveSections } from '../sections/registry.ts';
import { buildRoutes } from './routes.tsx';

const router = createBrowserRouter(buildRoutes(liveSections));

function App() {
  return <RouterProvider router={router} />;
}

export default App;
