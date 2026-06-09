import { useEffect, useMemo, useState } from 'react';
import { Download, Filter, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import api from '../../api/axios';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import { confirmDelete, toast } from '../../utils/alerts';

const blankForm = {
  studentId: '',
  fullName: '',
  faculty: 'Faculty of Information Technology',
  department: 'Information Technology',
  className: 'BIT-4A',
  password: '123456',
  status: 'active'
};

export default function AdminStudentsPage() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [showClassFilter, setShowClassFilter] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm);

  const loadClasses = async () => {
    const { data } = await api.get('/students/classes');
    setClasses(data || []);
  };

  const loadStudents = async (overrides = {}) => {
    setLoading(true);
    const className = Object.prototype.hasOwnProperty.call(overrides, 'selectedClass') ? overrides.selectedClass : selectedClass;
    const searchTerm = Object.prototype.hasOwnProperty.call(overrides, 'search') ? overrides.search : search;
    try {
      const { data } = await api.get('/students', {
        params: {
          limit: 1000,
          search: searchTerm,
          ...(className ? { className } : {})
        }
      });
      setStudents(data.data || []);
      await loadClasses();
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Failed to load students' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const groupedStudents = useMemo(() => {
    return students.reduce((groups, student) => {
      const key = student.className || 'Unassigned Class';
      groups[key] ||= [];
      groups[key].push(student);
      return groups;
    }, {});
  }, [students]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...blankForm, className: selectedClass || blankForm.className });
    setModalOpen(true);
  };

  const openEdit = (student) => {
    setEditing(student);
    setForm({
      studentId: student.studentId || '',
      fullName: student.fullName || '',
      faculty: student.faculty || '',
      department: student.department || '',
      className: student.className || '',
      password: '',
      status: student.status || 'active'
    });
    setModalOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    const payload = { ...form };
    if (!payload.password) delete payload.password;

    try {
      if (editing) await api.put(`/students/${editing._id}`, payload);
      else await api.post('/students', payload);
      toast.fire({ icon: 'success', title: editing ? 'Student updated' : 'Student created' });
      setModalOpen(false);
      loadStudents();
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Save failed' });
    }
  };

  const remove = async (student) => {
    const result = await confirmDelete();
    if (!result.isConfirmed) return;

    try {
      await api.delete(`/students/${student._id}`);
      toast.fire({ icon: 'success', title: 'Student deleted' });
      loadStudents();
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
      await api.post('/students/import-csv', data);
      toast.fire({ icon: 'success', title: 'Students imported' });
      loadStudents();
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Import failed' });
    } finally {
      event.target.value = '';
    }
  };

  const exportCsv = async () => {
    const response = await api.get('/students/export-csv', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'students.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Students"
        subtitle="Manage students by class without requiring email registration."
        actions={
          <>
            <button className="btn-secondary" onClick={() => setShowClassFilter((value) => !value)}>
              <Filter size={16} />
              Filter Classes
            </button>
            <label className="btn-secondary cursor-pointer">
              <Upload size={16} />
              Import Students CSV
              <input type="file" accept=".csv" className="hidden" onChange={importCsv} />
            </label>
            <button className="btn-secondary" onClick={exportCsv}><Download size={16} />Export</button>
            <button className="btn-primary" onClick={openCreate}><Plus size={16} />Add Student</button>
          </>
        }
      />

      <div className="panel mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input className="input" placeholder="Search student ID or name" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && loadStudents()} />
          <button className="btn-primary" onClick={loadStudents}>Apply Search</button>
        </div>
        {showClassFilter ? (
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <select className="input" value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)}>
              <option value="">All Classes</option>
              {classes.map((className) => <option key={className} value={className}>{className}</option>)}
            </select>
            <button className="btn-primary" onClick={loadStudents}>Filter Classes</button>
            <button className="btn-secondary" onClick={() => { setSelectedClass(''); loadStudents({ selectedClass: '' }); }}>Clear</button>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="panel p-8 text-center text-sm text-stone-500">Loading students...</div>
      ) : Object.keys(groupedStudents).length === 0 ? (
        <EmptyState title="No students found" />
      ) : (
        <div className="space-y-5">
          {Object.entries(groupedStudents).sort(([a], [b]) => a.localeCompare(b)).map(([className, rows]) => (
            <section key={className} className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 p-4">
                <div>
                  <h2 className="font-bold text-stone-900">{className}</h2>
                  <p className="text-sm text-stone-500">{rows.length} students</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-200 text-sm">
                  <thead className="bg-white">
                    <tr>
                      {['Student ID', 'Full Name', 'Faculty', 'Department', 'Status', 'Actions'].map((head) => (
                        <th key={head} className="whitespace-nowrap px-4 py-3 text-left font-semibold text-stone-600">{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {rows.map((student) => (
                      <tr key={student._id}>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-huGreen">{student.studentId}</td>
                        <td className="whitespace-nowrap px-4 py-3">{student.fullName}</td>
                        <td className="whitespace-nowrap px-4 py-3">{student.faculty}</td>
                        <td className="whitespace-nowrap px-4 py-3">{student.department}</td>
                        <td className="whitespace-nowrap px-4 py-3 capitalize">{student.status}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex gap-2">
                            <button className="btn-secondary px-3" onClick={() => openEdit(student)} aria-label="Edit student"><Pencil size={15} /></button>
                            <button className="btn-danger px-3" onClick={() => remove(student)} aria-label="Delete student"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form onSubmit={save} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-md bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-900">{editing ? 'Edit Student' : 'Add Student'}</h2>
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Close</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Student ID"><input className="input" value={form.studentId} onChange={(event) => setForm({ ...form, studentId: event.target.value })} required /></Field>
              <Field label="Full Name"><input className="input" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required /></Field>
              <Field label="Faculty"><input className="input" value={form.faculty} onChange={(event) => setForm({ ...form, faculty: event.target.value })} required /></Field>
              <Field label="Department"><input className="input" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} required /></Field>
              <Field label="Class Name"><input className="input" value={form.className} onChange={(event) => setForm({ ...form, className: event.target.value })} required /></Field>
              <Field label={editing ? 'New Password' : 'Password'}><input className="input" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required={!editing} /></Field>
              <Field label="Status">
                <select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </Field>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn-primary">Save Student</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

function Field({ label, children }) {
  return (
    <label>
      <span className="mb-1 block text-xs font-semibold uppercase text-stone-500">{label}</span>
      {children}
    </label>
  );
}
