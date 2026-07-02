import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, Download, Eye, Pencil, Plus, Search, Trash2, Upload, Users } from 'lucide-react';
import api from '../../api/axios';
import BulkImportWizard from '../../components/BulkImportWizard';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import { confirmDelete, toast } from '../../utils/alerts';

const blankForm = {
  studentId: '',
  fullName: '',
  facultyId: '',
  departmentId: '',
  classId: '',
  password: '123456',
  status: 'active'
};

const pageSize = 12;

export default function AdminStudentsPage() {
  const [students, setStudents] = useState([]);
  const [participation, setParticipation] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [masterClasses, setMasterClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [filters, setFilters] = useState({ facultyId: '', departmentId: '', search: '', status: '' });
  const [studentSearch, setStudentSearch] = useState('');
  const [studentStatus, setStudentStatus] = useState('');
  const [sort, setSort] = useState({ key: 'fullName', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm);

  const load = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value && value !== 'evaluated' && value !== 'pending'));
      const [studentRes, participationRes, facultyRes, departmentRes, classRes] = await Promise.all([
        api.get('/students', { params: { ...params, limit: 5000 } }),
        api.get('/evaluations/participation', { params }),
        api.get('/faculties'),
        api.get('/departments'),
        api.get('/classes')
      ]);
      setStudents(studentRes.data.data || []);
      setParticipation(participationRes.data.rows || []);
      setFaculties(facultyRes.data.data || []);
      setDepartments(departmentRes.data.data || []);
      setMasterClasses(classRes.data.data || []);
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Failed to load students' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const classCards = useMemo(() => {
    const map = new Map();
    masterClasses.forEach((item) => {
      if (filters.facultyId && String(item.faculty) !== String(filters.facultyId)) return;
      if (filters.departmentId && String(item.department) !== String(filters.departmentId)) return;
      const key = String(item._id || item.className);
      map.set(key, {
        classId: item._id,
        className: item.className,
        facultyId: item.faculty,
        faculty: item.facultyName,
        departmentId: item.department,
        department: item.departmentName,
        semester: item.semester,
        academicYear: item.academicYear,
        students: [],
        participationRows: []
      });
    });
    students.forEach((student) => {
      const key = String(student.classId || student.className);
      if (!map.has(key)) {
        map.set(key, {
          classId: student.classId,
          className: student.className || 'Unassigned Class',
          facultyId: student.facultyId,
          faculty: student.faculty,
          departmentId: student.departmentId,
          department: student.department,
          semester: student.semester,
          academicYear: student.academicYear,
          students: [],
          participationRows: []
        });
      }
      map.get(key).students.push(student);
    });
    participation.forEach((row) => {
      const key = String(row.classId || row.className);
      if (!map.has(key)) {
        map.set(key, {
          classId: row.classId,
          className: row.className || 'Unassigned Class',
          facultyId: row.facultyId,
          faculty: row.faculty,
          departmentId: row.departmentId,
          department: row.department,
          semester: '',
          academicYear: '',
          students: [],
          participationRows: []
        });
      }
      map.get(key).participationRows.push(row);
    });
    return [...map.values()]
      .map((item) => {
        const studentIds = new Set(item.students.map((student) => student.studentId));
        const evaluatedIds = new Set(item.participationRows.filter((row) => row.status === 'evaluated').map((row) => row.studentId));
        const scores = item.participationRows.filter((row) => Number(row.courseScore)).map((row) => Number(row.courseScore));
        const evaluatedStudents = [...evaluatedIds].filter((studentId) => studentIds.has(studentId)).length;
        const totalStudents = item.students.length;
        return {
          ...item,
          totalStudents,
          evaluatedStudents,
          pendingStudents: Math.max(totalStudents - evaluatedStudents, 0),
          participationRate: totalStudents ? Number(((evaluatedStudents / totalStudents) * 100).toFixed(1)) : 0,
          averageRating: scores.length ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2)) : 0
        };
      })
      .filter((item) => !filters.search || `${item.className} ${item.faculty} ${item.department}`.toLowerCase().includes(filters.search.toLowerCase()))
      .filter((item) => filters.status === 'evaluated' ? item.pendingStudents === 0 && item.totalStudents > 0 : filters.status === 'pending' ? item.pendingStudents > 0 : true)
      .sort((a, b) => a.className.localeCompare(b.className));
  }, [filters, masterClasses, participation, students]);

  const selectedRows = useMemo(() => {
    if (!selectedClass) return [];
    const rowsByStudent = new Map();
    selectedClass.students.forEach((student) => {
      rowsByStudent.set(student.studentId, {
        ...student,
        evaluationStatus: 'Pending',
        evaluatedCount: 0,
        possibleCount: selectedClass.participationRows.filter((row) => row.studentId === student.studentId).length,
        attendance: '-',
        recommendation: '-',
        averageRating: 0
      });
    });
    selectedClass.participationRows.forEach((row) => {
      const student = rowsByStudent.get(row.studentId);
      if (!student) return;
      if (row.status === 'evaluated') {
        const previousScores = student._scores || [];
        const nextScores = row.courseScore ? [...previousScores, Number(row.courseScore)] : previousScores;
        rowsByStudent.set(row.studentId, {
          ...student,
          evaluationStatus: 'Evaluated',
          evaluatedCount: student.evaluatedCount + 1,
          attendance: row.attendanceRate || student.attendance,
          recommendation: row.recommendation || student.recommendation,
          averageRating: nextScores.length ? Number((nextScores.reduce((sum, value) => sum + value, 0) / nextScores.length).toFixed(2)) : 0,
          _scores: nextScores
        });
      }
    });
    const search = studentSearch.toLowerCase();
    return [...rowsByStudent.values()]
      .filter((student) => !search || `${student.studentId} ${student.fullName}`.toLowerCase().includes(search))
      .filter((student) => !studentStatus || student.evaluationStatus === studentStatus)
      .sort((a, b) => {
        const left = a[sort.key] || '';
        const right = b[sort.key] || '';
        const result = typeof left === 'number' ? left - right : String(left).localeCompare(String(right));
        return sort.dir === 'asc' ? result : -result;
      });
  }, [selectedClass, sort, studentSearch, studentStatus]);

  const pages = Math.max(Math.ceil(selectedRows.length / pageSize), 1);
  const pagedRows = selectedRows.slice((page - 1) * pageSize, page * pageSize);
  const availableDepartments = departments.filter((item) => !form.facultyId || String(item.faculty) === String(form.facultyId));
  const availableClasses = masterClasses.filter((item) => !form.departmentId || String(item.department) === String(form.departmentId));
  const filterDepartments = departments.filter((item) => !filters.facultyId || String(item.faculty) === String(filters.facultyId));

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...blankForm,
      facultyId: selectedClass?.facultyId || '',
      departmentId: selectedClass?.departmentId || '',
      classId: selectedClass?.classId || ''
    });
    setModalOpen(true);
  };

  const openEdit = (student) => {
    setEditing(student);
    setForm({
      studentId: student.studentId || '',
      fullName: student.fullName || '',
      facultyId: student.facultyId || '',
      departmentId: student.departmentId || '',
      classId: student.classId || '',
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
      await load();
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
      await load();
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Delete failed' });
    }
  };

  const downloadStudentTemplate = async () => {
    const response = await api.get('/students/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'student-import-template.xlsx';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const exportStudents = async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value && value !== 'evaluated' && value !== 'pending'));
    const response = await api.get('/students/export', { params: { ...params, format: 'xlsx' }, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'students.xlsx';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const changeSort = (key) => {
    setSort((current) => ({ key, dir: current.key === key && current.dir === 'asc' ? 'desc' : 'asc' }));
  };

  return (
    <>
      <PageHeader
        title={selectedClass ? selectedClass.className : 'Students'}
        subtitle={selectedClass ? `${selectedClass.faculty} / ${selectedClass.department}` : 'Google Classroom style class view with evaluation participation and student drill-down.'}
        actions={
          <>
            {selectedClass ? <button className="btn-secondary" onClick={() => { setSelectedClass(null); setPage(1); }}><ArrowLeft size={16} />Classes</button> : null}
            <button className="btn-primary" onClick={openCreate}><Plus size={16} />Add Student</button>
            <button className="btn-secondary" onClick={() => setImportOpen(true)}><Upload size={16} />Bulk Import Students</button>
            <button className="btn-secondary" onClick={downloadStudentTemplate}><Download size={16} />Download Student Template</button>
            <button className="btn-secondary" onClick={exportStudents}><Download size={16} />Export Students</button>
          </>
        }
      />

      {!selectedClass ? (
        <>
          <section className="panel mb-5 p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input className="input !pl-12" placeholder="Search class, faculty, department" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
              </div>
              <select className="input" value={filters.facultyId} onChange={(event) => setFilters({ ...filters, facultyId: event.target.value, departmentId: '' })}>
                <option value="">All Faculties</option>
                {faculties.map((faculty) => <option key={faculty._id} value={faculty._id}>{faculty.name}</option>)}
              </select>
              <select className="input" value={filters.departmentId} onChange={(event) => setFilters({ ...filters, departmentId: event.target.value })}>
                <option value="">All Departments</option>
                {filterDepartments.map((department) => <option key={department._id} value={department._id}>{department.name}</option>)}
              </select>
              <select className="input" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
                <option value="">All Participation</option>
                <option value="evaluated">Fully Evaluated</option>
                <option value="pending">Has Pending</option>
              </select>
              <button className="btn-primary" onClick={load}>Refresh</button>
            </div>
          </section>

          {loading ? <ClassSkeleton /> : !classCards.length ? <EmptyState title="No classes found" /> : (
            <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {classCards.map((item) => (
                <article key={item.classId || item.className} className="panel overflow-hidden transition hover:-translate-y-0.5 hover:shadow-glass">
                  <div className="border-b border-slate-100 bg-gradient-to-br from-emerald-50 to-blue-50 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="truncate text-xl font-black text-huText">{item.className}</h2>
                        <p className="mt-1 truncate text-sm text-slate-600">{item.faculty}</p>
                        <p className="truncate text-sm text-slate-500">{item.department}</p>
                      </div>
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white text-huGreen shadow-sm"><Users size={21} /></span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <span>{item.semester || 'No semester'}</span>
                      <span className="text-right">{item.academicYear || 'No year'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 p-5 text-sm">
                    <Metric label="Students" value={item.totalStudents} />
                    <Metric label="Evaluated" value={item.evaluatedStudents} tone="green" />
                    <Metric label="Pending" value={item.pendingStudents} tone="amber" />
                    <Metric label="Average" value={`${item.averageRating}/5`} tone="blue" />
                  </div>
                  <div className="px-5 pb-5">
                    <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-500">
                      <span>Participation</span>
                      <span>{item.participationRate}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-huGreen" style={{ width: `${item.participationRate}%` }} /></div>
                    <button className="btn-primary mt-4 w-full" onClick={() => { setSelectedClass(item); setPage(1); setStudentSearch(''); setStudentStatus(''); }}><Eye size={16} />View Students</button>
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      ) : (
        <section className="panel overflow-hidden">
          <div className="border-b border-slate-100 p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input className="input !pl-12" placeholder="Search student ID or name" value={studentSearch} onChange={(event) => { setStudentSearch(event.target.value); setPage(1); }} />
              </div>
              <select className="input lg:w-52" value={studentStatus} onChange={(event) => { setStudentStatus(event.target.value); setPage(1); }}>
                <option value="">All Students</option>
                <option value="Evaluated">Evaluated</option>
                <option value="Pending">Pending</option>
              </select>
              <div className="flex items-center justify-end gap-2 text-sm font-semibold text-slate-500"><BarChart3 size={17} />{selectedRows.length} records</div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  {[
                    ['studentId', 'Student ID'],
                    ['fullName', 'Student Name'],
                    ['faculty', 'Faculty'],
                    ['department', 'Department'],
                    ['className', 'Class'],
                    ['evaluationStatus', 'Evaluation Status'],
                    ['attendance', 'Attendance'],
                    ['recommendation', 'Recommendation'],
                    ['averageRating', 'Average Rating']
                  ].map(([key, label]) => <th key={key} className="whitespace-nowrap px-4 py-3 font-semibold"><button onClick={() => changeSort(key)}>{label}</button></th>)}
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedRows.map((student) => (
                  <tr key={student._id}>
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-huGreen">{student.studentId}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-huText">{student.fullName}</td>
                    <td className="whitespace-nowrap px-4 py-3">{student.faculty}</td>
                    <td className="whitespace-nowrap px-4 py-3">{student.department}</td>
                    <td className="whitespace-nowrap px-4 py-3">{student.className}</td>
                    <td className="whitespace-nowrap px-4 py-3"><span className={`rounded-md px-2 py-1 text-xs font-bold ${student.evaluationStatus === 'Evaluated' ? 'bg-emerald-50 text-huGreen' : 'bg-amber-50 text-amber-700'}`}>{student.evaluationStatus}</span></td>
                    <td className="whitespace-nowrap px-4 py-3">{student.attendance}</td>
                    <td className="whitespace-nowrap px-4 py-3">{student.recommendation}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-bold">{student.averageRating || 0}/5</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button className="btn-secondary mr-2 px-3" onClick={() => openEdit(student)} aria-label="Edit student"><Pencil size={15} /></button>
                      <button className="btn-danger px-3" onClick={() => remove(student)} aria-label="Delete student"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
                {!pagedRows.length ? <tr><td colSpan="10" className="px-4 py-8 text-center text-slate-500">No students match this filter.</td></tr> : null}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={pages} onPage={setPage} />
        </section>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form onSubmit={save} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-huText">{editing ? 'Edit Student' : 'Add Student'}</h2>
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Close</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Student ID"><input className="input" value={form.studentId} onChange={(event) => setForm({ ...form, studentId: event.target.value })} required /></Field>
              <Field label="Full Name"><input className="input" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required /></Field>
              <Field label="Faculty"><select className="input" value={form.facultyId} onChange={(event) => setForm({ ...form, facultyId: event.target.value, departmentId: '', classId: '' })} required><option value="">Select Faculty</option>{faculties.map((faculty) => <option key={faculty._id} value={faculty._id}>{faculty.name}</option>)}</select></Field>
              <Field label="Department"><select className="input" value={form.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value, classId: '' })} required><option value="">Select Department</option>{availableDepartments.map((department) => <option key={department._id} value={department._id}>{department.name}</option>)}</select></Field>
              <Field label="Class"><select className="input" value={form.classId} onChange={(event) => setForm({ ...form, classId: event.target.value })} required><option value="">Select Class</option>{availableClasses.map((classItem) => <option key={classItem._id} value={classItem._id}>{classItem.className} / {classItem.semester} / {classItem.academicYear}</option>)}</select></Field>
              <Field label={editing ? 'New Password' : 'Password'}><input className="input" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required={!editing} /></Field>
              <Field label="Status"><select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="active">active</option><option value="inactive">inactive</option></select></Field>
            </div>
            <div className="mt-5 flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn-primary">Save Student</button></div>
          </form>
        </div>
      ) : null}
      {importOpen ? <BulkImportWizard title="Students" endpoint="/students" onClose={() => setImportOpen(false)} onImported={load} /> : null}
    </>
  );
}

function Metric({ label, value, tone = 'slate' }) {
  const color = tone === 'green' ? 'text-huGreen' : tone === 'amber' ? 'text-amber-600' : tone === 'blue' ? 'text-huBlue' : 'text-huText';
  return <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-400">{label}</p><p className={`mt-1 text-xl font-black ${color}`}>{value}</p></div>;
}

function Pagination({ page, pages, onPage }) {
  const numbers = Array.from({ length: pages }, (_, index) => index + 1).filter((item) => item === 1 || item === pages || Math.abs(item - page) <= 3);
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 p-4">
      <button className="btn-secondary px-3" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      {numbers.map((item, index) => (
        <button key={`${item}-${index}`} className={item === page ? 'btn-primary px-3' : 'btn-secondary px-3'} onClick={() => onPage(item)}>{item}</button>
      ))}
      <button className="btn-secondary px-3" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  );
}

function ClassSkeleton() {
  return <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="panel h-64 animate-pulse bg-slate-100" />)}</div>;
}

function Field({ label, children }) {
  return <label><span className="mb-1 block text-xs font-bold uppercase text-slate-500">{label}</span>{children}</label>;
}
