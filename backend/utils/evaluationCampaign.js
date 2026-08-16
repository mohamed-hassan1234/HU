const EvaluationCampaign = require('../models/EvaluationCampaign');

const targetsAssignment = (campaign, assignment) => {
  if (campaign.targetType === 'all') return true;
  const value = campaign.targetType === 'faculty' ? assignment.facultyId
    : campaign.targetType === 'department' ? assignment.departmentId : assignment.classId;
  return campaign.targetIds.some((id) => String(id) === String(value));
};

const activeCampaignForAssignment = async (assignment, now = new Date()) => {
  const campaign = await EvaluationCampaign.findOne({
    academicYear: assignment.academicYearId,
    term: assignment.termId,
    status: 'open',
    startsAt: { $lte: now },
    endsAt: { $gte: now }
  });
  return campaign && targetsAssignment(campaign, assignment) ? campaign : null;
};

module.exports = { activeCampaignForAssignment, targetsAssignment };
