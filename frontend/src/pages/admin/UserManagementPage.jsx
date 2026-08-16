import { useEffect, useState } from 'react';
import { Download, KeyRound, Pencil, Plus, Power, Search, Trash2, Upload } from 'lucide-react';
import api from '../../api/axios';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import SearchableSelect from '../../components/SearchableSelect';
import { confirmDelete, toast } from '../../utils/alerts';

const blankUser = {
  fullName: '',
  loginId: '',
  email: '',
  password: '',
  role: 'registration',
  facultyId: '',
  departmentId: '',
  permissions: '',
  status: 'active'
};

const roleOptions = ['registration', 'dean'];

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({ search: '', role: '', status: '', facultyId: '' });
  const [form, setForm] = useState(blankUser);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
    try {
      const { data } = await api.get('/users', { params: { ...params, limit: 200 } });
      setUsers(data.data || []);
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Users failed to load' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([api.get('/faculties'), api.get('/departments')]).then(([facultyRes, departmentRes]) => {
      setFaculties(facultyRes.data.data || []);
      setDepartments(departmentRes.data.data || []);
    });
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(blankUser);
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditing(user);
    setForm({
      fullName: user.fullName || '',
      loginId: user.loginId || '',
      email: user.email || '',
      password: '',
      role: user.role || 'registration',
      facultyId: user.facultyId || '',
      departmentId: user.departmentId || '',
      permissions: (user.permissions || []).join('|'),
      status: user.status || 'active'
    });
    setModalOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      departmentId: form.role === 'registration' ? form.departmentId : '',
      permissions: form.permissions.split('|').map((item) => item.trim()).filter(Boolean)
    };
    if (editing && !payload.password) delete payload.password;
    try {
      if (editing) await api.put(`/users/${editing._id}`, payload);
      else await api.post('/users', payload);
      toast.fire({ icon: 'success', title: editing ? 'User updated' : 'User created' });
      setModalOpen(false);
      load();
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Save failed' });
    }
  };

  const remove = async (user) => {
    const result = await confirmDelete();
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/users/${user._id}`);
      toast.fire({ icon: 'success', title: 'User deleted' });
      load();
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Delete failed' });
    }
  };

  const toggleStatus = async (user) => {
    const status = user.status === 'active' ? 'inactive' : 'active';
    await api.patch(`/users/${user._id}/status`, { status });
    toast.fire({ icon: 'success', title: status === 'active' ? 'User activated' : 'User deactivated' });
    load();
  };

  const resetPassword = async (user) => {
    await api.patch(`/users/${user._id}/reset-password`, { password: '12345678@HU' });
    toast.fire({ icon: 'success', title: 'Password reset to 12345678@HU' });
  };

  const exportCsv = async () => {
    const response = await api.get('/users/export-csv', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'users.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const importCsv = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const data = new FormData();
    data.append('file', file);
    try {
      await api.post('/users/import-csv', data);
      toast.fire({ icon: 'success', title: 'Users imported' });
      load();
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Import failed' });
    } finally {
      event.target.value = '';
    }
  };

  return (
    <>
      <PageHeader
        title="User Management"
        subtitle="Create and control Dean and Registration Officer accounts."
        actions={
          <>
            <label className="btn-secondary cursor-pointer"><Upload size={16} />Import CSV<input type="file" accept=".csv" className="hidden" onChange={importCsv} /></label>
            <button className="btn-secondary" onClick={exportCsv}><Download size={16} />Export</button>
            <button className="btn-primary" onClick={openCreate}><Plus size={16} />Create User</button>
          </>
        }
      />

      <section className="panel mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <input className="input" placeholder="Search users" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
          <SearchableSelect value={filters.role} onChange={(value) => setFilters({ ...filters, role: value })} options={roleOptions} placeholder="All Roles" label="Filter by role" />
          <SearchableSelect value={filters.status} onChange={(value) => setFilters({ ...filters, status: value })} options={['active', 'inactive']} placeholder="All Statuses" label="Filter by status" />
          <SearchableSelect value={filters.facultyId} onChange={(value) => setFilters({ ...filters, facultyId: value })} options={faculties.map((item) => ({ value: item._id, label: item.name }))} placeholder="All Faculties" label="Filter by faculty" />
          <button className="btn-primary" onClick={load}><Search size={16} />Apply</button>
        </div>
      </section>

      <section className="panel overflow-hidden">
        {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading users...</p> : !users.length ? <div className="p-4"><EmptyState /></div> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600"><tr>{['Full Name', 'Username', 'Email', 'Role', 'Faculty', 'Department', 'Status', 'Last Login', 'Created Date', 'Actions'].map((head) => <th key={head} className="whitespace-nowrap px-4 py-3 font-semibold">{head}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user._id}>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-huText">{user.fullName || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3">{user.loginId}</td>
                    <td className="whitespace-nowrap px-4 py-3">{user.email || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3">{user.role}</td>
                    <td className="whitespace-nowrap px-4 py-3">{user.faculty || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3">{user.department || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3 capitalize">{user.status}</td>
                    <td className="whitespace-nowrap px-4 py-3">{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button className="btn-secondary mr-2 px-3" onClick={() => openEdit(user)}><Pencil size={15} /></button>
                      <button className="btn-secondary mr-2 px-3" onClick={() => resetPassword(user)}><KeyRound size={15} /></button>
                      <button className="btn-secondary mr-2 px-3" onClick={() => toggleStatus(user)}><Power size={15} /></button>
                      <button className="btn-danger px-3" onClick={() => remove(user)}><Trash2 size={15} /></button>
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
          <form onSubmit={save} className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-huText">{editing ? 'Edit User' : 'Create User'}</h2><button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Close</button></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full Name"><input className="input" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required /></Field>
              <Field label="Username"><input className="input" value={form.loginId} onChange={(event) => setForm({ ...form, loginId: event.target.value })} required disabled={Boolean(editing)} /></Field>
              <Field label="Email"><input className="input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
              <Field label={editing ? 'New Password' : 'Password'}><input className="input" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required={!editing} /></Field>
              <Field label="Role"><SearchableSelect value={form.role} onChange={(value) => setForm({ ...form, role: value, departmentId: value === 'registration' ? form.departmentId : '' })} options={roleOptions} placeholder="Select Role" label="Role" /></Field>
              <Field label="Status"><SearchableSelect value={form.status} onChange={(value) => setForm({ ...form, status: value })} options={['active', 'inactive']} placeholder="Select Status" label="Status" /></Field>
              <Field label="Faculty"><SearchableSelect value={form.facultyId} onChange={(value) => setForm({ ...form, facultyId: value, departmentId: '' })} options={faculties.map((item) => ({ value: item._id, label: item.name }))} placeholder="Select Faculty" label="Faculty" required /></Field>
              {form.role === 'registration' ? <Field label="Department"><SearchableSelect value={form.departmentId} onChange={(value) => setForm({ ...form, departmentId: value })} options={departments.filter((item) => String(item.faculty) === String(form.facultyId)).map((item) => ({ value: item._id, label: item.name }))} placeholder="Select Department" label="Department" required /></Field> : null}
              <label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold uppercase text-slate-500">Permissions (use | separator)</span><input className="input" value={form.permissions} onChange={(event) => setForm({ ...form, permissions: event.target.value })} placeholder="students.manage|assignments.manage|reports.department" /></label>
            </div>
            <div className="mt-5 flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn-primary">Save User</button></div>
          </form>
        </div>
      ) : null}
    </>
  );
}

function Field({ label, children }) {
  return <label><span className="mb-1 block text-xs font-bold uppercase text-slate-500">{label}</span>{children}</label>;
}
