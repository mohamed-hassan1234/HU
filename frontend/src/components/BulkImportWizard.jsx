import { CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import api from '../api/axios';
import { toast } from '../utils/alerts';

const steps = ['Upload File', 'Validate Data', 'Preview Records', 'Show Errors', 'Import Data', 'Success Report'];

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

export default function BulkImportWizard({ title, endpoint, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [validation, setValidation] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const activeStep = success ? 5 : validation?.summary?.invalidRecords ? 3 : validation ? 2 : file ? 1 : 0;
  const previewRows = useMemo(() => (validation?.rows || []).slice(0, 100), [validation]);
  const invalidRows = validation?.rows?.filter((row) => !row.valid) || [];

  const chooseFile = (selected) => {
    const nextFile = selected?.[0];
    if (!nextFile) return;
    const name = nextFile.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx')) {
      toast.fire({ icon: 'error', title: 'Only .csv and .xlsx files are supported' });
      return;
    }
    setFile(nextFile);
    setValidation(null);
    setSuccess(null);
  };

  const validate = async () => {
    if (!file) return;
    setLoading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const { data } = await api.post(`${endpoint}/bulk-import/validate`, form, {
        onUploadProgress: () => {}
      });
      setValidation(data);
      toast.fire({ icon: data.summary.invalidRecords ? 'warning' : 'success', title: data.summary.invalidRecords ? 'Validation completed with errors' : 'Validation passed' });
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Validation failed' });
    } finally {
      setLoading(false);
    }
  };

  const commit = async () => {
    if (!validation?.token) return;
    setLoading(true);
    try {
      const { data } = await api.post(`${endpoint}/bulk-import/commit`, { token: validation.token });
      setSuccess(data.summary);
      toast.fire({ icon: 'success', title: data.message || 'Import completed' });
      onImported?.();
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Import failed' });
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async () => {
    const response = await api.get(`${endpoint}/template`, { responseType: 'blob' });
    downloadBlob(new Blob([response.data]), `${title.toLowerCase().replace(/\s+/g, '-')}-template.xlsx`);
  };

  const downloadCsvTemplate = async () => {
    const response = await api.get(`${endpoint}/template`, { params: { format: 'csv' }, responseType: 'blob' });
    downloadBlob(new Blob([response.data]), `${title.toLowerCase().replace(/\s+/g, '-')}-template.csv`);
  };

  const downloadErrors = async () => {
    const response = await api.get(`${endpoint}/bulk-import/errors/${validation.token}`, {
      params: { format: 'xlsx' },
      responseType: 'blob'
    });
    downloadBlob(new Blob([response.data]), `${title.toLowerCase().replace(/\s+/g, '-')}-import-errors.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <section className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <h2 className="text-xl font-black text-huText">Bulk Import {title}</h2>
            <p className="mt-1 text-sm text-slate-500">Upload, validate, preview, fix errors, and import up to 10,000 records.</p>
          </div>
          <button className="btn-secondary px-3" onClick={onClose} aria-label="Close import wizard"><X size={16} /></button>
        </header>

        <div className="grid gap-2 border-b border-slate-100 bg-slate-50/60 p-4 md:grid-cols-6">
          {steps.map((step, index) => (
            <div key={step} className={`rounded-md border px-3 py-2 text-xs font-bold ${index <= activeStep ? 'border-huGreen/30 bg-white text-huGreen' : 'border-slate-200 bg-white text-slate-400'}`}>
              <span className="mr-2 inline-grid h-5 w-5 place-items-center rounded-full bg-current/10">{index + 1}</span>
              {step}
            </div>
          ))}
        </div>

        <main className="overflow-y-auto p-5">
          <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <div
                className={`grid min-h-56 place-items-center rounded-lg border-2 border-dashed p-6 text-center transition ${dragging ? 'border-huGreen bg-huGreen/5' : 'border-slate-200 bg-slate-50/60'}`}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  chooseFile(event.dataTransfer.files);
                }}
              >
                <div>
                  <FileSpreadsheet className="mx-auto text-huGreen" size={42} />
                  <p className="mt-3 font-bold text-huText">{file ? file.name : 'Drop Excel or CSV file here'}</p>
                  <p className="mt-1 text-sm text-slate-500">Supported: .xlsx, .csv / Maximum 10,000 records / UTF-8 CSV</p>
                  <label className="btn-secondary mt-4 cursor-pointer">
                    <Upload size={16} />
                    Choose File
                    <input type="file" accept=".xlsx,.csv" className="hidden" onChange={(event) => chooseFile(event.target.files)} />
                  </label>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button className="btn-secondary" onClick={downloadTemplate}><Download size={16} />Excel Template</button>
                <button className="btn-secondary" onClick={downloadCsvTemplate}><Download size={16} />CSV Template</button>
                <button className="btn-primary" onClick={validate} disabled={!file || loading}>{loading && !validation ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}Validate Data</button>
              </div>

              {validation ? <Summary validation={validation} /> : null}
              {success ? <SuccessSummary summary={success} /> : null}
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white p-4">
                <div>
                  <h3 className="font-bold text-huText">Preview Records</h3>
                  <p className="text-xs text-slate-500">Showing first 100 uploaded rows.</p>
                </div>
                {invalidRows.length ? <button className="btn-secondary" onClick={downloadErrors}><Download size={16} />Download Error Report</button> : null}
              </div>
              <div className="max-h-[440px] overflow-auto">
                <table className="min-w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Name / ID</th>
                      <th className="px-3 py-2">Faculty</th>
                      <th className="px-3 py-2">Department</th>
                      <th className="px-3 py-2">Errors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.map((row) => (
                      <tr key={row.rowNumber} className={row.valid ? 'bg-white' : 'bg-red-50/70'}>
                        <td className="whitespace-nowrap px-3 py-2 font-bold">{row.rowNumber}</td>
                        <td className="whitespace-nowrap px-3 py-2"><span className={`rounded px-2 py-1 font-bold ${row.valid ? 'bg-emerald-50 text-huGreen' : 'bg-red-100 text-red-700'}`}>{row.valid ? 'Valid' : 'Invalid'}</span></td>
                        <td className="whitespace-nowrap px-3 py-2">{row.data.fullName || `${row.data.firstName || ''} ${row.data.lastName || ''}`.trim() || row.data.studentId || row.data.lecturerId || row.data.employeeId}</td>
                        <td className="whitespace-nowrap px-3 py-2">{row.data.faculty}</td>
                        <td className="whitespace-nowrap px-3 py-2">{row.data.department}</td>
                        <td className="min-w-64 px-3 py-2 text-red-700">{row.errors.join(' | ') || row.warnings.join(' | ') || '-'}</td>
                      </tr>
                    ))}
                    {!previewRows.length ? <tr><td colSpan="6" className="px-3 py-8 text-center text-slate-500">Upload a file and validate it to preview records.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 p-4">
          <p className="text-sm text-slate-500">No records are saved until validation passes and you click Import Data.</p>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={onClose}>Close</button>
            <button className="btn-primary" onClick={commit} disabled={!validation || validation.summary.invalidRecords > 0 || loading || success}>
              {loading && validation ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
              Import Data
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function Summary({ validation }) {
  const items = [
    ['Total Records', validation.summary.totalRecords],
    ['Valid Records', validation.summary.validRecords],
    ['Invalid Records', validation.summary.invalidRecords],
    ['Duplicate Records', validation.summary.duplicateRecords],
    ['Warnings', validation.summary.warningRecords],
    ['Processing Time', `${validation.processingTimeMs}ms`]
  ];
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
          <p className="mt-1 text-lg font-black text-huText">{value}</p>
        </div>
      ))}
    </div>
  );
}

function SuccessSummary({ summary }) {
  return (
    <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-center gap-2 font-black text-huGreen"><CheckCircle2 size={20} />Import Completed</div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <p>Total: <b>{summary.totalRecords}</b></p>
        <p>Imported: <b>{summary.importedSuccessfully}</b></p>
        <p>Failed: <b>{summary.failedRecords}</b></p>
        <p>Skipped: <b>{summary.skippedRecords}</b></p>
        <p>Duplicates: <b>{summary.duplicateRecords}</b></p>
        <p>Success: <b>{summary.successPercentage}%</b></p>
      </div>
    </div>
  );
}
