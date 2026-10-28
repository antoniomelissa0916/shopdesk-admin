import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

export default function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" />
      <div className="card empty-state">
        <p>We couldn't find the page you were looking for.</p>
        <Link to="/">Back to Home</Link>
      </div>
    </>
  );
}
