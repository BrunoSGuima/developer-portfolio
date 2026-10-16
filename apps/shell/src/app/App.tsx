import AppLayout from './layout/AppLayout.tsx';

function App() {
  return (
    <AppLayout currentPath={window.location.pathname}>
      <h1>Hi, I&apos;m Bruno.</h1>
    </AppLayout>
  );
}

export default App;
