const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseOptions, readCsv, sendCsv } = require('../utils/csv');

const run = async () => {
  let csv = '';
  const headers = {};
  const response = {
    header(name, value) {
      headers[name] = value;
      return this;
    },
    attachment(filename) {
      headers.filename = filename;
      return this;
    },
    send(value) {
      csv = value;
    }
  };
  const source = {
    fullName: 'Ayaan, Maxamed',
    comment: 'Clear explanation, "excellent" work\nSecond line',
    options: ['Good', 'Needs review'],
    faculty: 'Computer Science & IT'
  };
  sendCsv(response, 'round-trip.csv', [source], [
    { header: 'full_name', key: 'fullName' },
    { header: 'comment', key: 'comment' },
    { header: 'options', key: 'options' },
    { header: 'faculty', key: 'faculty' }
  ]);
  assert.equal(headers['Content-Type'], 'text/csv; charset=utf-8');
  assert.equal(headers.filename, 'round-trip.csv');
  assert.ok(csv.startsWith('\uFEFF'));

  const filePath = path.join(__dirname, 'round-trip.tmp.csv');
  fs.writeFileSync(filePath, csv, 'utf8');
  const rows = await readCsv(filePath);
  assert.equal(fs.existsSync(filePath), false);
  assert.deepEqual(rows, [{
    full_name: source.fullName,
    comment: source.comment,
    options: 'Good|Needs review',
    faculty: source.faculty
  }]);
  assert.deepEqual(parseOptions('Excellent | Good || Average '), ['Excellent', 'Good', 'Average']);
  console.log('CSV checks passed: UTF-8 BOM, escaping, multiline text, arrays, header normalization, parsing, and cleanup.');
};

run().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
