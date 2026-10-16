import { Link } from 'react-router';

function NotFoundPage() {
  return (
    <>
      <h1>Page not found</h1>
      <p>There is nothing at this address.</p>
      <p>
        <Link to="/">Back to home</Link>
      </p>
    </>
  );
}

export default NotFoundPage;
