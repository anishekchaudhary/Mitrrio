const jwt = require('jsonwebtoken');
const User = require('../models/User');

const adminOnly = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Unauthorized: No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('isAdmin');

    if (user && user.isAdmin) {
      req.user = user;
      next(); // Let them pass
    } else {
      return res.status(403).json({ message: 'Access denied: Admin privileges required' });
    }
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

module.exports = adminOnly;