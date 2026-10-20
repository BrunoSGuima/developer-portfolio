import { useMessages } from '../../i18n/context.ts';

/** Rendered inside the shell when a section fails to load or render. */
function RouteErrorPage() {
  const messages = useMessages();

  return (
    <>
      <h1>{messages.error.title}</h1>
      <p>{messages.error.text}</p>
      <p>
        <button type="button" onClick={() => window.location.reload()}>
          {messages.error.reload}
        </button>
      </p>
    </>
  );
}

export default RouteErrorPage;
