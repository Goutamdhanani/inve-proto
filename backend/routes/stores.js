const express = require('express');
const router = express.Router();
const Store = require('../models/Store');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// GET /api/stores
router.get('/', async (req, res) => {
  try {
    if (req.user.role === 'owner') {
      const stores = await Store.find().populate('managerId', 'name email').sort({ name: 1 });
      return res.json(stores);
    }
    // manager/staff — return only their assigned store
    if (!req.user.storeId) return res.json([]);
    const store = await Store.findById(req.user.storeId).populate('managerId', 'name email');
    return res.json(store ? [store] : []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/stores
router.post('/', authorize('owner'), async (req, res) => {
  try {
    const store = await Store.create(req.body);
    await AuditLog.create({
      actorId: req.user.id,
      action: 'create_store',
      metadata: { storeId: store._id, name: store.name }
    });
    res.status(201).json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/stores/:id
router.put('/:id', authorize('owner'), async (req, res) => {
  try {
    // Prevent overriding manager assignment via this endpoint
    const { managerId, ...updateData } = req.body;
    const store = await Store.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    }).populate('managerId', 'name email');
    if (!store) return res.status(404).json({ message: 'Store not found' });
    await AuditLog.create({
      actorId: req.user.id,
      action: 'update_store',
      metadata: { storeId: store._id, name: store.name }
    });
    res.json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/stores/:id — soft-delete
router.delete('/:id', authorize('owner'), async (req, res) => {
  try {
    const store = await Store.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive', isActive: false },
      { new: true }
    );
    if (!store) return res.status(404).json({ message: 'Store not found' });
    await AuditLog.create({
      actorId: req.user.id,
      action: 'delete_store',
      metadata: { storeId: store._id, name: store.name }
    });
    res.json({ message: 'Store deactivated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/stores/:id/manager — assign manager (owner only)
router.put('/:id/manager', authorize('owner'), async (req, res) => {
  try {
    const { managerId } = req.body;
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

    if (managerId) {
      const manager = await User.findById(managerId);
      if (!manager) return res.status(404).json({ success: false, message: 'User not found' });
      if (!['manager', 'owner'].includes(manager.role)) {
        return res.status(400).json({ success: false, message: 'User must have manager or owner role' });
      }
    }

    store.managerId = managerId || null;
    await store.save();

    const populated = await Store.findById(store._id).populate('managerId', 'name email');
    await AuditLog.create({
      actorId: req.user.id,
      action: 'assign_store_manager',
      metadata: { storeId: store._id, managerId: managerId || null }
    });
    res.json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
