import { useState, useEffect, useCallback } from 'react';
import { FiMapPin, FiPlus, FiEdit2, FiTrash2, FiUser, FiUsers } from 'react-icons/fi';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import Modal from '../components/ui/Modal.jsx';
import Alert from '../components/ui/Alert.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/axios.js';

const EMPTY_FORM = { name: '', code: '', address: '', phone: '', email: '' };

export default function OwnerStores() {
  const [stores, setStores] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [editStore, setEditStore] = useState(null);
  const [managerStore, setManagerStore] = useState(null);
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const showAlert = (message, type = 'error') => setAlert({ message, type });
  const clearAlert = () => setAlert(null);

  const loadStores = useCallback(async () => {
    try {
      const data = await apiGet('/stores');
      setStores(Array.isArray(data) ? data : []);
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadManagers = useCallback(async () => {
    try {
      const data = await apiGet('/employees');
      const list = Array.isArray(data) ? data : (data.data || []);
      setManagers(list.filter((u) => u.role === 'manager'));
    } catch {
      setManagers([]);
    }
  }, []);

  useEffect(() => {
    loadStores();
    loadManagers();
  }, [loadStores, loadManagers]);

  const openCreate = () => {
    setEditStore(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (store) => {
    setEditStore(store);
    setForm({
      name: store.name,
      code: store.code,
      address: store.address || '',
      phone: store.phone || '',
      email: store.email || '',
    });
    setShowModal(true);
  };

  const openManagerModal = (store) => {
    setManagerStore(store);
    setSelectedManagerId(store.managerId?._id || '');
    setShowManagerModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editStore) {
        await apiPut(`/stores/${editStore._id}`, form);
        showAlert('Store updated successfully', 'success');
      } else {
        await apiPost('/stores', form);
        showAlert('Store created successfully', 'success');
      }
      setShowModal(false);
      await loadStores();
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (store) => {
    if (!window.confirm(`Deactivate store "${store.name}"?`)) return;
    try {
      await apiDelete(`/stores/${store._id}`);
      showAlert('Store deactivated', 'success');
      await loadStores();
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    }
  };

  const handleAssignManager = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPut(`/stores/${managerStore._id}/manager`, { managerId: selectedManagerId || null });
      showAlert('Manager assigned successfully', 'success');
      setShowManagerModal(false);
      await loadStores();
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Stores</h2>
          <p className="text-sm text-slate-500">Manage all store locations</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary">
          <FiPlus size={15} /> New Store
        </button>
      </div>

      {alert && <Alert message={alert.message} type={alert.type} onClose={clearAlert} className="mb-4" />}

      {loading ? (
        <LoadingSpinner />
      ) : stores.length === 0 ? (
        <div className="card p-12 text-center">
          <FiMapPin size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No stores yet. Create your first store.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <div key={store._id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-800">{store.name}</h3>
                  <span className="badge badge-info text-xs">{store.code}</span>
                </div>
                <span className={`badge ${store.status === 'inactive' ? 'badge-danger' : 'badge-success'}`}>
                  {store.status || 'active'}
                </span>
              </div>

              {store.address && (
                <p className="text-xs text-slate-500 mb-1">{store.address}</p>
              )}
              {store.phone && (
                <p className="text-xs text-slate-500 mb-1">{store.phone}</p>
              )}
              {store.email && (
                <p className="text-xs text-slate-500 mb-3">{store.email}</p>
              )}

              <div className="flex items-center gap-1 text-xs text-slate-500 mb-4">
                <FiUser size={12} />
                {store.managerId ? (
                  <span>{store.managerId.name}</span>
                ) : (
                  <span className="text-slate-400 italic">No manager assigned</span>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <button onClick={() => openEdit(store)} className="btn btn-outline btn-sm">
                  <FiEdit2 size={12} /> Edit
                </button>
                <button onClick={() => openManagerModal(store)} className="btn btn-outline btn-sm">
                  <FiUsers size={12} /> Manager
                </button>
                <button onClick={() => handleDelete(store)} className="btn btn-danger btn-sm">
                  <FiTrash2 size={12} /> Deactivate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editStore ? 'Edit Store' : 'New Store'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">Store Name *</label>
            <input
              className="form-control"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="form-label">Store Code *</label>
            <input
              className="form-control uppercase"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="e.g. MAIN, NYC01"
              required
              disabled={!!editStore}
            />
          </div>
          <div>
            <label className="form-label">Address</label>
            <input
              className="form-control"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Phone</label>
              <input
                className="form-control"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : editStore ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Manager Modal */}
      <Modal isOpen={showManagerModal} onClose={() => setShowManagerModal(false)} title="Assign Manager">
        <form onSubmit={handleAssignManager} className="space-y-4">
          <p className="text-sm text-slate-600">
            Assign a manager to <strong>{managerStore?.name}</strong>
          </p>
          <div>
            <label className="form-label">Manager</label>
            <select
              className="form-control"
              value={selectedManagerId}
              onChange={(e) => setSelectedManagerId(e.target.value)}
            >
              <option value="">-- No Manager --</option>
              {managers.map((m) => (
                <option key={m._id} value={m._id}>{m.name} ({m.email})</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowManagerModal(false)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : 'Assign'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
