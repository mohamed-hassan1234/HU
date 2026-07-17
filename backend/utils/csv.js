const fs = require('fs');
const csvParser = require('csv-parser');

const readCsv = (filePath) =>
  new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csvParser({
        mapHeaders: ({ header }) => String(header).replace(/^\uFEFF/, '').trim().toLowerCase()
      }))
      .on('data', (row) => rows.push(row))
      .on('end', () => {
        fs.unlink(filePath, () => {});
        resolve(rows);
      })
      .on('error', (error) => {
        fs.unlink(filePath, () => {});
        reject(error);
      });
  });

const escapeCsv = (value) => {
  if (value === null || value === undefined) return '';
  const rawValue = Array.isArray(value) ? value.join('|') : String(value);
  const stringValue = /^[=+\-@]/.test(rawValue) ? `'${rawValue}` : rawValue;
  if (/[",\n\r]/.test(stringValue)) return `"${stringValue.replace(/"/g, '""')}"`;
  return stringValue;
};

const sendCsv = (res, filename, rows, columns) => {
  const header = columns.map((column) => column.header).join(',');
  const body = rows
    .map((row) => columns.map((column) => escapeCsv(row[column.key])).join(','))
    .join('\n');
  res.header('Content-Type', 'text/csv; charset=utf-8');
  res.attachment(filename);
  res.send(`\uFEFF${[header, body].filter(Boolean).join('\n')}`);
};

const parseOptions = (value) => {
  if (!value) return [];
  return String(value)
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
};

module.exports = { readCsv, sendCsv, parseOptions };
