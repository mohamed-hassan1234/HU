const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { readCsv, sendCsv } = require('./csv');

const MAX_IMPORT_ROWS = 10000;
const sessionDir = path.join(__dirname, '..', 'uploads', 'import-sessions');
if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

const normalizeHeader = (value) =>
  String(value || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const normalizeText = (value) => String(value ?? '').trim();

const normalizeLookup = (value) => normalizeText(value).toLowerCase().replace(/[^a-z0-9]/g, '');

const readImportFile = async (file) => {
  if (!file) {
    const error = new Error('Import file is required');
    error.statusCode = 400;
    throw error;
  }
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (ext === '.csv') return readCsv(file.path);
  if (ext === '.xlsx') {
    try {
      const workbook = XLSX.readFile(file.path, { cellDates: false });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
    } finally {
      fs.unlink(file.path, () => {});
    }
  }
  fs.unlink(file.path, () => {});
  const error = new Error('Only .xlsx and .csv files are supported');
  error.statusCode = 400;
  throw error;
};

const mapRow = (row, fields) => {
  const normalized = Object.entries(row || {}).reduce((acc, [key, value]) => {
    acc[normalizeHeader(key)] = normalizeText(value);
    return acc;
  }, {});
  return fields.reduce((acc, field) => {
    const aliases = [field.header, field.key, ...(field.aliases || [])].map(normalizeHeader);
    const match = aliases.find((alias) => Object.prototype.hasOwnProperty.call(normalized, alias));
    acc[field.key] = match ? normalized[match] : '';
    return acc;
  }, {});
};

const ensureLimit = (rows) => {
  if (rows.length > MAX_IMPORT_ROWS) {
    const error = new Error(`Maximum ${MAX_IMPORT_ROWS} records are allowed per import`);
    error.statusCode = 400;
    throw error;
  }
};

const writeSession = (type, payload) => {
  const token = crypto.randomBytes(24).toString('hex');
  const filePath = path.join(sessionDir, `${type}-${token}.json`);
  fs.writeFileSync(filePath, JSON.stringify(payload), 'utf8');
  return token;
};

const readSession = (type, token) => {
  if (!/^[a-f0-9]{48}$/.test(String(token || ''))) {
    const error = new Error('Invalid import session');
    error.statusCode = 400;
    throw error;
  }
  const filePath = path.join(sessionDir, `${type}-${token}.json`);
  if (!fs.existsSync(filePath)) {
    const error = new Error('Import session expired or was not found');
    error.statusCode = 404;
    throw error;
  }
  return { filePath, data: JSON.parse(fs.readFileSync(filePath, 'utf8')) };
};

const removeSession = (filePath) => fs.unlink(filePath, () => {});

const sendWorkbook = (res, filename, rows, headers, sheetName = 'Data') => {
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.attachment(filename);
  res.send(buffer);
};

const sendTemplate = (res, filename, fields, sample = {}) => {
  const headers = fields.map((field) => field.header);
  const row = headers.reduce((acc, header) => {
    acc[header] = sample[header] || '';
    return acc;
  }, {});
  sendWorkbook(res, filename, [row], headers, 'Template');
};

const sendRows = (req, res, filename, rows, fields) => {
  const format = String(req.query.format || 'csv').toLowerCase();
  const exportRows = rows.map((row) => fields.reduce((acc, field) => {
    acc[field.header] = row[field.key] ?? '';
    return acc;
  }, {}));
  if (format === 'xlsx') {
    return sendWorkbook(res, filename.replace(/\.csv$/i, '.xlsx'), exportRows, fields.map((field) => field.header));
  }
  return sendCsv(res, filename, rows, fields.map((field) => ({ header: field.header, key: field.key })));
};

const buildErrorRows = (validationRows) =>
  validationRows.map((row) => ({
    Row: row.rowNumber,
    Status: row.valid ? 'Valid' : 'Invalid',
    Errors: row.errors.join(' | '),
    Warnings: row.warnings.join(' | '),
    ...row.data
  }));

module.exports = {
  MAX_IMPORT_ROWS,
  normalizeHeader,
  normalizeText,
  normalizeLookup,
  readImportFile,
  mapRow,
  ensureLimit,
  writeSession,
  readSession,
  removeSession,
  sendTemplate,
  sendRows,
  sendWorkbook,
  buildErrorRows
};
