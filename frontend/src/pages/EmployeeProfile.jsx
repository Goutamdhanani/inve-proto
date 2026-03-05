import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUser } from 'react-icons/fi';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import Alert from '../components/ui/Alert.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { RoleBadge } from '../components/ui/Badge.jsx';
import { apiGet } from '../api/axios.js';
import { fmtDate } from '../utils/helpers.js';

const STATUS_BADGE = {
  approved: 'badge-success',
  pending: 'badge-warning',
  rejected: 'badge-danger',
  suspended: 'badge-danger',
  deactivated: 'badge-gray',
};

export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const showAlert = (message, type = 'error') => setAlert({ message, type });

  useEffect(() => {
    apiGet(`/employees/${id}`)
      .then((data) => setEmployee(data.data || data))
      .catch((err) => showAlert(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <DashboardLayout>
      <button
        onClick={() => navigate(-1)}
        className="btn btn-outline btn-sm mb-6"
      >
        <FiArrowLeft size={14} /> Back
      </button>

      {alert && <Alert message={alert.message} type={alert.type} className="mb-4" />}

      {loading ? (
        <LoadingSpinner />
      ) : !employee ? (
        <p className="text-slate-500">Employee not found.</p>
      ) : (
        <div className="card p-6 max-w-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
              {employee.name?.[0]?.toUpperCase() || <FiUser size={24} />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{employee.name}</h2>
              <p className="text-slate-500 text-sm">{employee.email}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500">Role</span>
              <RoleBadge role={employee.role} />
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500">Status</span>
              <span className={`badge ${STATUS_BADGE[employee.status] || 'badge-gray'}`}>
                {employee.status}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500">Store</span>
              <span className="text-sm text-slate-700">
                {employee.storeId ? `${employee.storeId.name} (${employee.storeId.code})` : '—'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500">Joined</span>
              <span className="text-sm text-slate-700">{fmtDate(employee.createdAt)}</span>
            </div>
            {employee.lastLogin && (
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Last Login</span>
                <span className="text-sm text-slate-700">{fmtDate(employee.lastLogin)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
