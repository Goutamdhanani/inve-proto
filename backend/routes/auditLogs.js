const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// GET /api/audit-logs — owner: all, manager: own store
router.get('/', authorize('owner', 'manager'), async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'manager') {
      if (!req.user.storeId) return res.json({ success: true, data: [] });
      filter.storeId = req.user.storeId;
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actorId', 'name email role')
        .populate('targetId', 'name email role')
        .populate('storeId', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter)
    ]);

    res.json({ success: true, data: logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
