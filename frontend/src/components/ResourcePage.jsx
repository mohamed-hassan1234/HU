import { useEffect, useMemo, useState } from 'react';
import { Download, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import api from '../api/axios';
import { confirmDelete, toast } from '../utils/alerts';
import EmptyState from './EmptyState';
import PageHeader from './PageHeader';
import { useAuth } from '../context/AuthContext';

const initialValues = (fields) =>
  fields.reduce((acc, field) => {
    acc[field.name] = field.defaultValue || '';
    return acc;
  }, {});

export default function ResourcePage({ title, subtitle, endpoint, fields, columns, csvEndpoint }) {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialValues(fields));
  const [modalOpen, setModalOpen] = useState(false);

  const visibleRows = useMemo(() => rows, [rows]);
  const readOnly = user?.role === 'registration' && endpoint === '/courses';

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(endpoint, { params: { search, limit: 100 } });
      setRows(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Failed to load records' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(initialValues(fields));
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm(fields.reduce((acc, field) => ({ ...acc, [field.name]: row[field.name] ?? '' }), {}));
    setModalOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      if (editing) await api.put(`${endpoint}/${editing._id}`, form);
      else await api.post(endpoint, form);
      toast.fire({ icon: 'success', title: editing ? 'Record updated' : 'Record created' });
      setModalOpen(false);
      load();
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Save failed' });
    }
  };

  const remove = async (row) => {
    const result = await confirmDelete();
    if (!result.isConfirmed) return;
    try {
      await api.delete(`${endpoint}/${row._id}`);
      toast.fire({ icon: 'success', title: 'Record deleted' });
      load();
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Delete failed' });
    }
  };

  const importCsv = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const data = new FormData();
    data.append('file', file);
    try {
      await api.post(`${csvEndpoint || endpoint}/import-csv`, data);
      toast.fire({ icon: 'success', title: 'CSV imported' });
      load();
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Import failed' });
    } finally {
      event.target.value = '';
    }
  };

  const exportCsv = async () => {
    const response = await api.get(`${csvEndpoint || endpoint}/export-csv`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, '-')}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          readOnly ? null : <>
            <label className="btn-secondary cursor-pointer">
              <Upload size={16} />
              Import CSV
              <input type="file" accept=".csv" className="hidden" onChange={importCsv} />
            </label>
            <button className="btn-secondary" onClick={exportCsv}>
              <Download size={16} />
              Export
            </button>
            <button className="btn-primary" onClick={openCreate}>
              <Plus size={16} />
              Add
            </button>
          </>
        }
      />
      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input className="input !pl-12" placeholder="Search records" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
          </div>
          <button className="btn-secondary" onClick={load}>Apply</button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading records...</div>
        ) : visibleRows.length === 0 ? (
          <div className="p-4"><EmptyState /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-500">{column.label}</th>
                  ))}
                  {!readOnly ? <th className="px-4 py-3 text-right font-semibold text-slate-500">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {visibleRows.map((row) => (
                  <tr key={row._id}>
                    {columns.map((column) => (
                      <td key={column.key} className="whitespace-nowrap px-4 py-3 text-slate-600">{Array.isArray(row[column.key]) ? row[column.key].join(', ') : row[column.key]}</td>
                    ))}
                    {!readOnly ? <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button className="btn-secondary mr-2 px-3" onClick={() => openEdit(row)} aria-label="Edit"><Pencil size={15} /></button>
                      <button className="btn-danger px-3" onClick={() => remove(row)} aria-label="Delete"><Trash2 size={15} /></button>
                    </td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form onSubmit={submit} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-huText">{editing ? `Edit ${title}` : `Add ${title}`}</h2>
              <button type="button" className="btn-secondary px-3" onClick={() => setModalOpen(false)}>Close</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <label key={field.name} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{field.label}</span>
                  {field.type === 'select' ? (
                    <select className="input" value={form[field.name]} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}>
                      <option value="">Select</option>
                      {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea className="input min-h-28" value={form[field.name]} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })} />
                  ) : (
                    <input className="input" type={field.type || 'text'} value={form[field.name]} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })} />
                  )}
                </label>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn-primary">Save</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
