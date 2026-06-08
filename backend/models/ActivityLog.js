const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    actorLoginId: String,
    actorRole: String,
    action: String,
    entity: String,
    entityId: String,
    details: Object
  },
  { timestamps: true }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
