const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { parseOptions, readCsv, sendCsv } = require('../utils/csv');

test('CSV export and import round-trip preserves escaped and Unicode values', async () => {
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
  const rows = [{
    fullName: 'Ayaan, Maxamed',
    comment: 'Clear explanation, "excellent" work\nSecond line',
    options: ['Good', 'Needs review'],
    faculty: 'Computer Science & IT'
  }];
  const columns = [
    { header: 'full_name', key: 'fullName' },
    { header: 'comment', key: 'comment' },
    { header: 'options', key: 'options' },
    { header: 'faculty', key: 'faculty' }
  ];

  sendCsv(response, 'round-trip.csv', rows, columns);
  assert.equal(headers['Content-Type'], 'text/csv; charset=utf-8');
  assert.equal(headers.filename, 'round-trip.csv');
  assert.ok(csv.startsWith('\uFEFF'));

  const filePath = path.join(__dirname, 'round-trip.tmp.csv');
  fs.writeFileSync(filePath, csv, 'utf8');
  const imported = await readCsv(filePath);
  assert.equal(fs.existsSync(filePath), false);
  assert.deepEqual(imported, [{
    full_name: rows[0].fullName,
    comment: rows[0].comment,
    options: 'Good|Needs review',
    faculty: rows[0].faculty
  }]);
});

test('CSV option parsing trims values and removes empty entries', () => {
  assert.deepEqual(parseOptions('Excellent | Good || Average '), ['Excellent', 'Good', 'Average']);
  assert.deepEqual(parseOptions(''), []);
});
