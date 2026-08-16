const validateSemesterForTerm = ({ semester, termNumber, totalSemesters }) => {
  const value = Number(semester);
  const maximum = Number(totalSemesters);
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    return { valid: false, message: `Current semester must be between 1 and ${maximum}` };
  }
  const expectedParity = Number(termNumber) === 1 ? 1 : 0;
  if (value % 2 !== expectedParity) {
    return { valid: false, message: `Term ${termNumber} requires ${Number(termNumber) === 1 ? 'an odd' : 'an even'} program semester` };
  }
  return { valid: true, semester: value };
};

module.exports = { validateSemesterForTerm };
