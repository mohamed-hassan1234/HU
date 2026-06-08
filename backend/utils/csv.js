const fs = require('fs');
const csvParser = require('csv-parser');

const readCsv = (filePath) =>
  new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => rows.push(row))
      .on('end', () => {
        fs.unlink(filePath, () => {});
        resolve(rows);
      })
      .on('error', reject);
  });

const escapeCsv = (value) => {
  if (value === null || value === undefined) return '';
  const stringValue = Array.isArray(value) ? value.join('|') : String(value);
  if (/[",\n\r]/.test(stringValue)) return `"${stringValue.replace(/"/g, '""')}"`;
  return stringValue;
};

const sendCsv = (res, filename, rows, columns) => {
  const header = columns.map((column) => column.header).join(',');
  const body = rows
    .map((row) => columns.map((column) => escapeCsv(row[column.key])).join(','))
    .join('\n');
  res.header('Content-Type', 'text/csv');
  res.attachment(filename);
  res.send([header, body].filter(Boolean).join('\n'));
};

const parseOptions = (value) => {
  if (!value) return [];
  return String(value)
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
};

module.exports = { readCsv, sendCsv, parseOptions };
