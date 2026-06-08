const ActivityLog = require('../models/ActivityLog');

const logActivity = async (req, action, entity, entityId, details = {}) => {
  try {
    await ActivityLog.create({
      actorLoginId: req.user?.loginId || 'system',
      actorRole: req.user?.role || 'system',
      action,
      entity,
      entityId,
      details
    });
  } catch (error) {
    console.error('Activity log failed:', error.message);
  }
};

module.exports = logActivity;
