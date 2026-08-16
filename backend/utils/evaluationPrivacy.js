const anonymousEvaluation = (evaluation, studentName) => {
  const safe = evaluation?.toObject ? evaluation.toObject() : { ...evaluation };
  if (safe.anonymous) {
    delete safe.studentId;
    safe.studentName = 'Anonymous';
    return safe;
  }
  safe.studentName = studentName || safe.studentId;
  return safe;
};

const anonymousExportRow = (evaluation) => {
  const safe = evaluation?.toObject ? evaluation.toObject() : { ...evaluation };
  if (safe.anonymous) safe.studentId = '';
  return safe;
};

module.exports = { anonymousEvaluation, anonymousExportRow };
