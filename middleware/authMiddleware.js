const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'User no longer exists.' });
      }
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Authentication failed. Token invalid or expired.' });
    }
  }
  return res.status(401).json({ message: 'No authorization token supplied.' });
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Forbidden: Access restricted to [${roles.join(', ')}]. Your role is '${req.user.role}'.` 
      });
    }
    next();
  };
};

module.exports = { protect, authorize };