import { useState, useEffect, useCallback } from 'react';
import { FiActivity, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import Alert from '../components/ui/Alert.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { apiGet } from '../api/axios.js';
import { fmtDate } from '../utils/helpers.js';

const ACTION_LABELS = {
  create_store: 'Created Store',
  update_store: 'Updated Store',
  delete_store: 'Deactivated Store',
  assign_store_manager: 'Assigned Store Manager',
  approve_user: 'Approved User',
  reject_user: 'Rejected User',
  promote_employee: 'Promoted Employee',
  demote_employee: 'Demoted Employee',
  transfer_employee: 'Transferred Employee',
  suspend_employee: 'Suspended Employee',
  remove_employee: 'Removed Employee',
  change_password: 'Changed Password',
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('');

  const showAlert = (message, type = 'error') => setAlert({ message, type });
  const clearAlert = () => setAlert(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet('/audit-logs', { page, limit: 25 });
      setLogs(Array.isArray(data) ? data : (data.data || []));
      setTotalPages(data.pages || 1);
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const filtered = filter
    ? logs.filter((l) =>
        l.action?.includes(filter) ||
        l.actorId?.name?.toLowerCase().includes(filter.toLowerCase()) ||
        l.targetId?.name?.toLowerCase().includes(filter.toLowerCase())
      )
    : logs;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Audit Log</h2>
          <p className="text-sm text-slate-500">Track significant system actions</p>
        </div>
      </div>

      {alert && <Alert message={alert.message} type={alert.type} onClose={clearAlert} className="mb-4" />}

      <div className="mb-4">
        <input
          className="form-control max-w-xs"
          placeholder="Filter by action or user..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <FiActivity size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No audit log entries found.</p>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Store</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log._id}>
                    <td className="text-xs text-slate-400 whitespace-nowrap">{fmtDate(log.createdAt)}</td>
                    <td>
                      {log.actorId ? (
                        <div>
                          <div className="font-medium text-slate-800 text-xs">{log.actorId.name}</div>
                          <div className="text-slate-400 text-xs">{log.actorId.email}</div>
                        </div>
                      ) : '—'}
                    </td>
                    <td>
                      <span className="badge badge-info text-xs">
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td>
                      {log.targetId ? (
                        <div>
                          <div className="font-medium text-slate-700 text-xs">{log.targetId.name}</div>
                          <div className="text-slate-400 text-xs">{log.targetId.email}</div>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="text-slate-500 text-xs">{log.storeId?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-outline btn-sm"
              >
                <FiChevronLeft size={14} />
              </button>
              <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn btn-outline btn-sm"
              >
                <FiChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
