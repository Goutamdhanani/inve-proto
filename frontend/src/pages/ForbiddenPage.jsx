import { Link } from 'react-router-dom';
import { FiLock } from 'react-icons/fi';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <FiLock className="text-red-500" size={36} />
        </div>
        <h1 className="text-4xl font-bold text-slate-800 mb-2">403</h1>
        <h2 className="text-xl font-semibold text-slate-700 mb-3">Access Forbidden</h2>
        <p className="text-slate-500 mb-8">
          You don&apos;t have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <Link to="/dashboard" className="btn btn-primary justify-center">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
