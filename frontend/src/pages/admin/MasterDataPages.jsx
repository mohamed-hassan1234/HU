import { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, Pencil, Plus, Power, Search, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import SearchableSelect from '../../components/SearchableSelect';
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
        { name: 'totalSemesters', label: 'Total Program Semesters', required: true },
        { name: 'status', label: 'Status', type: 'select', options: statusOptions }
      ]}
      columns={[
        ['name', 'Department'],
        ['facultyName', 'Faculty'],
        ['code', 'Code'],
        ['totalSemesters', 'Semesters'],
        ['status', 'Status']
      ]}
      rowToForm={(row) => ({ ...row, faculty: row.faculty || row.facultyId })}
    />
  );
}

export function ClassManagementPage() {
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [academicTerms, setAcademicTerms] = useState([]);
  useEffect(() => {
    Promise.all([api.get('/faculties'), api.get('/departments'), api.get('/academic-years'), api.get('/academic-terms')])
      .then(([facultyRes, departmentRes, yearRes, termRes]) => {
        setFaculties(facultyRes.data.data || []);
        setDepartments(departmentRes.data.data || []);
        setAcademicYears(yearRes.data.data || []);
        setAcademicTerms(termRes.data.data || []);
      });
  }, []);
  return (
    <MasterDataPage
      title="Classes"
      subtitle="Create each permanent class once and track its current program semester on the shared calendar."
      endpoint="/classes"
      statusAction={false}
      blank={{ classCode: '', className: '', description: '', faculty: '', department: '', currentAcademicYear: '', currentTerm: '', currentSemester: '', status: 'active' }}
      fields={[
        { name: 'classCode', label: 'Class Code', required: true },
        { name: 'className', label: 'Class Name', required: true },
        { name: 'description', label: 'Description' },
        { name: 'faculty', label: 'Faculty', type: 'select', required: true, options: faculties.map((item) => ({ value: item._id, label: item.name })) },
        { name: 'department', label: 'Department', type: 'select', required: true, dependsOn: 'faculty', options: departments.map((item) => ({ value: item._id, label: item.name, faculty: String(item.faculty) })) },
        { name: 'currentAcademicYear', label: 'Academic Year', type: 'select', required: true, options: academicYears.map((item) => ({ value: item._id, label: `${item.name} (${item.status})` })) },
        { name: 'currentTerm', label: 'Term', type: 'select', required: true, dependsOn: 'currentAcademicYear', options: academicTerms.map((item) => ({ value: item._id, label: `${item.name} (${item.status})`, currentAcademicYear: String(item.academicYear) })) },
        { name: 'currentSemester', label: 'Program Semester', required: true },
        { name: 'status', label: 'Status', type: 'select', options: ['planned', 'active', 'suspended', 'archived'] }
      ]}
      columns={[
        ['classCode', 'Code'],
        ['className', 'Class'],
        ['facultyName', 'Faculty'],
        ['departmentName', 'Department'],
        ['currentAcademicYearName', 'Academic Year'],
        ['currentTermNumber', 'Term'],
        ['currentSemester', 'Semester'],
        ['status', 'Status']
      ]}
      rowToForm={(row) => ({ ...row, faculty: row.faculty, department: row.department, currentAcademicYear: row.currentAcademicYear, currentTerm: row.currentTerm })}
    />
  );
}

export function AcademicYearManagementPage() {
  return <MasterDataPage title="Academic Years" subtitle="Manage the shared university academic calendar." endpoint="/academic-years" lifecycle blank={{ name: '', startDate: '', endDate: '' }} fields={[
    { name: 'name', label: 'Academic Year (YYYY/YYYY)', required: true },
    { name: 'startDate', label: 'Start Date', required: true },
    { name: 'endDate', label: 'End Date', required: true }
  ]} columns={[["name", "Academic Year"], ["startDate", "Start Date"], ["endDate", "End Date"], ["status", "Status"]]} rowToForm={(row) => ({ ...row, startDate: String(row.startDate || '').slice(0, 10), endDate: String(row.endDate || '').slice(0, 10) })} />;
}

export function AcademicTermManagementPage() {
  const [years, setYears] = useState([]);
  useEffect(() => { api.get('/academic-years').then((res) => setYears(res.data.data || [])); }, []);
  return <MasterDataPage title="Academic Terms" subtitle="Each academic year contains shared Term 1 and Term 2." endpoint="/academic-terms" lifecycle blank={{ academicYear: '', termNumber: '', name: '', startDate: '', endDate: '' }} fields={[
    { name: 'academicYear', label: 'Academic Year', type: 'select', required: true, options: years.map((item) => ({ value: item._id, label: item.name })) },
    { name: 'termNumber', label: 'Term Number', type: 'select', required: true, options: ['1', '2'] },
    { name: 'name', label: 'Term Name', required: true },
    { name: 'startDate', label: 'Start Date', required: true },
    { name: 'endDate', label: 'End Date', required: true }
  ]} columns={[["academicYearName", "Academic Year"], ["name", "Term"], ["termNumber", "Number"], ["startDate", "Start Date"], ["endDate", "End Date"], ["status", "Status"]]} rowToForm={(row) => ({ ...row, academicYear: row.academicYear, startDate: String(row.startDate || '').slice(0, 10), endDate: String(row.endDate || '').slice(0, 10) })} />;
}

function MasterDataPage({ title, subtitle, endpoint, blank, fields, columns, rowToForm = (row) => row, lifecycle = false, statusAction = true }) {
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

  const setLifecycleStatus = async (row, status) => {
    try {
      await api.patch(`${endpoint}/${row._id}/status`, { status });
      toast.fire({ icon: 'success', title: `Record ${status}` });
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
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input className="input !pl-12" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && load()} placeholder={`Search ${title.toLowerCase()}`} />
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
                      {lifecycle ? <>{row.status === 'planned' ? <button className="btn-secondary mr-2 px-3" onClick={() => setLifecycleStatus(row, 'active')}>Activate</button> : null}{row.status !== 'closed' ? <button className="btn-secondary mr-2 px-3" onClick={() => setLifecycleStatus(row, 'closed')}>Close</button> : null}</> : statusAction ? <button className="btn-secondary mr-2 px-3" onClick={() => toggleStatus(row)}>{row.status === 'active' ? <Power size={15} /> : <CheckCircle2 size={15} />}</button> : null}
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
                      <SearchableSelect
                        value={form[field.name] || ''}
                        onChange={(nextValue) => setForm({ ...form, [field.name]: nextValue, ...(field.name === 'faculty' ? { department: '' } : {}) })}
                        options={(options || []).map((option) => (typeof option === 'string' ? option : { value: option.value, label: option.label }))}
                        placeholder="Select"
                        label={field.label}
                        required={field.required}
                      />
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
