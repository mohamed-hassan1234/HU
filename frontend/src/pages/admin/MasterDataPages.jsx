import { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, Pencil, Plus, Power, Search, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import { confirmDelete, toast } from '../../utils/alerts';

const statusOptions = ['active', 'inactive'];

export function FacultyManagementPage() {
  return (
    <MasterDataPage
      title="Faculties"
      subtitle="Manage university faculties used by departments, classes, users, students, lecturers, and analytics scopes."
      endpoint="/faculties"
      blank={{ name: '', code: '', description: '', status: 'active' }}
      fields={[
        { name: 'name', label: 'Faculty Name', required: true },
        { name: 'code', label: 'Code' },
        { name: 'description', label: 'Description' },
        { name: 'status', label: 'Status', type: 'select', options: statusOptions }
      ]}
      columns={[
        ['name', 'Faculty'],
        ['code', 'Code'],
        ['description', 'Description'],
        ['status', 'Status']
      ]}
    />
  );
}

export function DepartmentManagementPage() {
  const [faculties, setFaculties] = useState([]);
  useEffect(() => {
    api.get('/faculties').then((res) => setFaculties(res.data.data || []));
  }, []);
  return (
    <MasterDataPage
      title="Departments"
      subtitle="Every department belongs to exactly one faculty."
      endpoint="/departments"
      blank={{ name: '', code: '', faculty: '', description: '', status: 'active' }}
      fields={[
        { name: 'name', label: 'Department Name', required: true },
        { name: 'code', label: 'Code' },
        { name: 'faculty', label: 'Faculty', type: 'select', required: true, options: faculties.map((item) => ({ value: item._id, label: item.name })) },
        { name: 'description', label: 'Description' },
        { name: 'status', label: 'Status', type: 'select', options: statusOptions }
      ]}
      columns={[
        ['name', 'Department'],
        ['facultyName', 'Faculty'],
        ['code', 'Code'],
        ['status', 'Status']
      ]}
      rowToForm={(row) => ({ ...row, faculty: row.faculty || row.facultyId })}
    />
  );
}

export function ClassManagementPage() {
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  useEffect(() => {
    Promise.all([api.get('/faculties'), api.get('/departments')])
      .then(([facultyRes, departmentRes]) => {
        setFaculties(facultyRes.data.data || []);
        setDepartments(departmentRes.data.data || []);
      });
  }, []);
  return (
    <MasterDataPage
      title="Classes"
      subtitle="Classes are attached to a faculty, department, semester, and academic year."
      endpoint="/classes"
      blank={{ className: '', faculty: '', department: '', academicYear: '', semester: '', status: 'active' }}
      fields={[
        { name: 'className', label: 'Class Name', required: true },
        { name: 'faculty', label: 'Faculty', type: 'select', required: true, options: faculties.map((item) => ({ value: item._id, label: item.name })) },
        { name: 'department', label: 'Department', type: 'select', required: true, dependsOn: 'faculty', options: departments.map((item) => ({ value: item._id, label: item.name, faculty: String(item.faculty) })) },
        { name: 'academicYear', label: 'Academic Year', required: true },
        { name: 'semester', label: 'Semester', required: true },
        { name: 'status', label: 'Status', type: 'select', options: statusOptions }
      ]}
      columns={[
        ['className', 'Class'],
        ['facultyName', 'Faculty'],
        ['departmentName', 'Department'],
        ['academicYear', 'Academic Year'],
        ['semester', 'Semester'],
        ['status', 'Status']
      ]}
      rowToForm={(row) => ({ ...row, faculty: row.faculty, department: row.department })}
    />
  );
}

function MasterDataPage({ title, subtitle, endpoint, blank, fields, columns, rowToForm = (row) => row }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(endpoint, { params: search ? { search } : {} });
      setRows(data.data || []);
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Failed to load records' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visibleFields = useMemo(() => fields, [fields]);

  const openCreate = () => {
    setEditing(null);
    setForm(blank);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({ ...blank, ...rowToForm(row) });
    setModalOpen(true);
  };

  const save = async (event) => {
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

  const toggleStatus = async (row) => {
    const status = row.status === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`${endpoint}/${row._id}/status`, { status });
      toast.fire({ icon: 'success', title: status === 'active' ? 'Record activated' : 'Record deactivated' });
      load();
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Status update failed' });
    }
  };

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={<button className="btn-primary" onClick={openCreate}><Plus size={16} />Add {title.slice(0, -1)}</button>}
      />

      <section className="panel mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={17} />
            <input className="input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && load()} placeholder={`Search ${title.toLowerCase()}`} />
          </div>
          <button className="btn-secondary" onClick={load}>Search</button>
        </div>
      </section>

      <section className="panel overflow-hidden">
        {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading records...</p> : !rows.length ? <div className="p-4"><EmptyState /></div> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  {columns.map(([, label]) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row._id}>
                    {columns.map(([key]) => <td key={key} className="whitespace-nowrap px-4 py-3">{row[key] || '-'}</td>)}
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button className="btn-secondary mr-2 px-3" onClick={() => openEdit(row)}><Pencil size={15} /></button>
                      <button className="btn-secondary mr-2 px-3" onClick={() => toggleStatus(row)}>{row.status === 'active' ? <Power size={15} /> : <CheckCircle2 size={15} />}</button>
                      <button className="btn-danger px-3" onClick={() => remove(row)}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form onSubmit={save} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-huText"><Building2 size={19} />{editing ? `Edit ${title}` : `Add ${title}`}</h2>
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Close</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {visibleFields.map((field) => {
                const options = field.dependsOn
                  ? field.options.filter((item) => !form[field.dependsOn] || item[field.dependsOn] === String(form[field.dependsOn]))
                  : field.options;
                return (
                  <label key={field.name}>
                    <span className="mb-1 block text-xs font-bold uppercase text-slate-500">{field.label}</span>
                    {field.type === 'select' ? (
                      <select
                        className="input"
                        value={form[field.name] || ''}
                        onChange={(event) => setForm({ ...form, [field.name]: event.target.value, ...(field.name === 'faculty' ? { department: '' } : {}) })}
                        required={field.required}
                      >
                        <option value="">Select</option>
                        {(options || []).map((option) => typeof option === 'string'
                          ? <option key={option} value={option}>{option}</option>
                          : <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    ) : (
                      <input className="input" value={form[field.name] || ''} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} required={field.required} />
                    )}
                  </label>
                );
              })}
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
