/** Rendered inside the shell when a section fails to load or render. */
function RouteErrorPage() {
  return (
    <>
      <h1>Something went wrong</h1>
      <p>This section could not be loaded. Please try again.</p>
      <p>
        <button type="button" onClick={() => window.location.reload()}>
          Reload the page
        </button>
      </p>
    </>
  );
}

export default RouteErrorPage;
