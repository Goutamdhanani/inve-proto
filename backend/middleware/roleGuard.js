/**
 * roleGuard — returns middleware that checks if req.user.role is in the allowed roles array.
 * Returns 403 if unauthorized.
 */
const roleGuard = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions' });
    }
    next();
  };
};

module.exports = roleGuard;
