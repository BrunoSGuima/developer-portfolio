import { Link } from 'react-router';
import { useLocalizedPath, useMessages } from '../../i18n/context.ts';

function NotFoundPage() {
  const messages = useMessages();
  const to = useLocalizedPath();

  return (
    <>
      <h1>{messages.notFound.title}</h1>
      <p>{messages.notFound.text}</p>
      <p>
        <Link to={to('/')}>{messages.notFound.home}</Link>
      </p>
    </>
  );
}

export default NotFoundPage;
