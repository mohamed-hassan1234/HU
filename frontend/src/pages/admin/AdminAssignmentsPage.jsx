import { useEffect, useMemo, useState } from 'react';
import { Download, Eye, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import { confirmDelete, toast } from '../../utils/alerts';

const blankForm = {
  assignmentId: '',
  courseCode: '',
  lecturerId: '',
  classId: '',
  semester: '',
  academicYear: '',
  status: 'active'
};

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [masterClasses, setMasterClasses] = useState([]);
  const [filters, setFilters] = useState({ courseCode: '', lecturerId: '', className: '', semester: '', academicYear: '' });
  const [form, setForm] = useState(blankForm);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [participation, setParticipation] = useState(null);
  const [participationLoading, setParticipationLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAssignments = async () => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
    try {
      const { data } = await api.get('/assignments', { params: { ...params, limit: 200 } });
      setAssignments(data.data || []);
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Failed to load assignments' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([
      api.get('/courses', { params: { limit: 500 } }),
      api.get('/lecturers', { params: { limit: 500 } }),
      api.get('/students/classes'),
      api.get('/classes')
    ]).then(([courseRes, lecturerRes, classesRes, masterClassesRes]) => {
      setCourses(courseRes.data.data || []);
      setLecturers(lecturerRes.data.data || []);
      setClasses(classesRes.data || []);
      setMasterClasses(masterClassesRes.data.data || []);
    }).catch((error) => {
      console.error('Failed to load assignment form options', error);
      toast.fire({ icon: 'error', title: 'Failed to load assignment options' });
    });
  }, []);

  useEffect(() => {
    loadAssignments();
  }, []);

  const semesters = useMemo(() => [...new Set(assignments.map((item) => item.semester).filter(Boolean))], [assignments]);
  const years = useMemo(() => [...new Set(assignments.map((item) => item.academicYear).filter(Boolean))], [assignments]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...blankForm, assignmentId: `ASN-${Date.now().toString().slice(-6)}` });
    setModalOpen(true);
  };

  const openEdit = (assignment) => {
    setEditing(assignment);
    setForm({
      assignmentId: assignment.assignmentId,
      courseCode: assignment.courseCode,
      lecturerId: assignment.lecturerId,
      classId: assignment.classId || '',
      semester: assignment.semester,
      academicYear: assignment.academicYear,
      status: assignment.status
    });
    setModalOpen(true);
  };

  const viewAssignment = async (assignment) => {
    setParticipation({ assignment, totals: null, students: [] });
    setParticipationLoading(true);
    try {
      const { data } = await api.get(`/assignments/${assignment._id}/participation`);
      setParticipation(data);
    } catch (error) {
      setParticipation(null);
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Participation details failed to load' });
    } finally {
      setParticipationLoading(false);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    try {
      if (editing) await api.put(`/assignments/${editing._id}`, form);
      else await api.post('/assignments', form);
      toast.fire({ icon: 'success', title: editing ? 'Assignment updated' : 'Assignment created' });
      setModalOpen(false);
      loadAssignments();
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Assignment save failed' });
    }
  };

  const remove = async (assignment) => {
    const result = await confirmDelete();
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/assignments/${assignment._id}`);
      toast.fire({ icon: 'success', title: 'Assignment deleted' });
      loadAssignments();
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
      const response = await api.post('/assignments/import-csv', data);
      toast.fire({ icon: 'success', title: `Imported ${response.data.imported}, skipped ${response.data.skipped || 0}` });
      loadAssignments();
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Import failed' });
    } finally {
      event.target.value = '';
    }
  };

  const exportCsv = async () => {
    const response = await api.get('/assignments/export-csv', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'course_assignments.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Course Assignments"
        subtitle="Assignments connect courses, lecturers, classes, semesters, and evaluations."
        actions={
          <>
            <button className="btn-primary" onClick={openCreate}><Plus size={16} />Add Assignment</button>
            <label className="btn-secondary cursor-pointer">
              <Upload size={16} />
              Import Assignment CSV
              <input type="file" accept=".csv" className="hidden" onChange={importCsv} />
            </label>
            <button className="btn-secondary" onClick={exportCsv}><Download size={16} />Export Assignment CSV</button>
          </>
        }
      />

      <div className="panel mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <select className="input" value={filters.courseCode} onChange={(e) => setFilters({ ...filters, courseCode: e.target.value })}>
            <option value="">All Courses</option>
            {courses.map((course) => <option key={course._id} value={course.courseCode}>{course.courseCode} - {course.courseName}</option>)}
          </select>
          <select className="input" value={filters.lecturerId} onChange={(e) => setFilters({ ...filters, lecturerId: e.target.value })}>
            <option value="">All Lecturers</option>
            {lecturers.map((lecturer) => <option key={lecturer._id} value={lecturer.lecturerId}>{lecturer.lecturerId} - {lecturer.fullName}</option>)}
          </select>
          <select className="input" value={filters.className} onChange={(e) => setFilters({ ...filters, className: e.target.value })}>
            <option value="">All Classes</option>
            {classes.map((className) => <option key={className} value={className}>{className}</option>)}
          </select>
          <FilterInput placeholder="Semester" value={filters.semester} options={semesters} onChange={(value) => setFilters({ ...filters, semester: value })} />
          <FilterInput placeholder="Academic Year" value={filters.academicYear} options={years} onChange={(value) => setFilters({ ...filters, academicYear: value })} />
          <button className="btn-primary" onClick={loadAssignments}>Apply Filters</button>
        </div>
      </div>

      <div className="panel overflow-hidden">
        {loading ? <div className="p-8 text-center text-sm text-stone-500">Loading assignments...</div> : assignments.length === 0 ? <div className="p-4"><EmptyState /></div> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200 text-sm">
              <thead className="bg-stone-50">
                <tr>
                  {['Assignment ID', 'Course Code', 'Course Name', 'Class', 'Lecturer ID', 'Lecturer Name', 'Semester', 'Academic Year', 'Status', 'Actions'].map((head) => (
                    <th key={head} className="whitespace-nowrap px-4 py-3 text-left font-semibold text-stone-600">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {assignments.map((assignment) => (
                  <tr key={assignment._id}>
                    <td className="whitespace-nowrap px-4 py-3">{assignment.assignmentId}</td>
                    <td className="whitespace-nowrap px-4 py-3">{assignment.courseCode}</td>
                    <td className="whitespace-nowrap px-4 py-3">{assignment.courseName}</td>
                    <td className="whitespace-nowrap px-4 py-3">{assignment.className}</td>
                    <td className="whitespace-nowrap px-4 py-3">{assignment.lecturerId}</td>
                    <td className="whitespace-nowrap px-4 py-3">{assignment.lecturerName}</td>
                    <td className="whitespace-nowrap px-4 py-3">{assignment.semester}</td>
                    <td className="whitespace-nowrap px-4 py-3">{assignment.academicYear}</td>
                    <td className="whitespace-nowrap px-4 py-3 capitalize">{assignment.status}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex gap-2">
                        <button className="btn-secondary px-3" onClick={() => viewAssignment(assignment)} aria-label="View assignment"><Eye size={15} /></button>
                        <button className="btn-secondary px-3" onClick={() => openEdit(assignment)} aria-label="Edit assignment"><Pencil size={15} /></button>
                        <button className="btn-danger px-3" onClick={() => remove(assignment)} aria-label="Delete assignment"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {participation ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white p-5">
              <div>
                <h2 className="text-xl font-black text-huText">{participation.assignment.courseCode} - {participation.assignment.courseName}</h2>
                <p className="mt-1 text-sm text-slate-500">{participation.assignment.className} &bull; {participation.assignment.lecturerName} &bull; {participation.assignment.semester}</p>
              </div>
              <button className="btn-secondary" onClick={() => setParticipation(null)}>Close</button>
            </div>
            {participationLoading ? <div className="p-10 text-center text-sm text-slate-500">Loading class participation...</div> : (
              <>
                <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
                  <ParticipationMetric label="Eligible Students" value={participation.totals?.eligible || 0} />
                  <ParticipationMetric label="Submitted" value={participation.totals?.submitted || 0} color="text-huGreen" />
                  <ParticipationMetric label="Not Submitted" value={participation.totals?.pending || 0} color="text-huBlue" />
                  <ParticipationMetric label="Participation" value={`${participation.totals?.participationRate || 0}%`} />
                </div>
                <div className="overflow-x-auto border-t border-slate-100">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>{['Student', 'Student ID', 'Status', 'Submitted At', 'Course Score', 'Teacher Score'].map((item) => <th key={item} className="whitespace-nowrap px-4 py-3 font-semibold">{item}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(participation.students || []).map((student) => (
                        <tr key={student.studentId}>
                          <td className="px-4 py-3 font-semibold text-slate-800">{student.studentName}</td>
                          <td className="px-4 py-3">{student.studentId}</td>
                          <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${student.status === 'submitted' ? 'bg-huGreen/10 text-huGreen' : 'bg-huBlue/10 text-huBlue'}`}>{student.status === 'submitted' ? 'Submitted' : 'Not submitted'}</span></td>
                          <td className="whitespace-nowrap px-4 py-3">{student.submittedAt ? new Date(student.submittedAt).toLocaleString() : '-'}</td>
                          <td className="px-4 py-3">{student.courseScore ? `${student.courseScore}/5` : '-'}</td>
                          <td className="px-4 py-3">{student.teacherScore ? `${student.teacherScore}/5` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form onSubmit={save} className="w-full max-w-3xl rounded-md bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-900">{editing ? 'Edit Assignment' : 'Add Assignment'}</h2>
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Close</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Assignment ID"><input className="input" value={form.assignmentId} onChange={(e) => setForm({ ...form, assignmentId: e.target.value })} required /></Field>
              <Field label="Step 1: Select Course">
                <select className="input" value={form.courseCode} onChange={(e) => setForm({ ...form, courseCode: e.target.value })} required>
                  <option value="">Select Course</option>
                  {courses.map((course) => <option key={course._id} value={course.courseCode}>{course.courseCode} - {course.courseName}</option>)}
                </select>
              </Field>
              <Field label="Step 2: Select Lecturer">
                <select className="input" value={form.lecturerId} onChange={(e) => setForm({ ...form, lecturerId: e.target.value })} required>
                  <option value="">Select Lecturer</option>
                  {lecturers.map((lecturer) => <option key={lecturer._id} value={lecturer.lecturerId}>{lecturer.lecturerId} - {lecturer.fullName}</option>)}
                </select>
              </Field>
              <Field label="Step 3: Select Class">
                <select
                  className="input"
                  value={form.classId}
                  onChange={(e) => {
                    const classItem = masterClasses.find((item) => item._id === e.target.value);
                    setForm({
                      ...form,
                      classId: e.target.value,
                      semester: classItem?.semester || form.semester,
                      academicYear: classItem?.academicYear || form.academicYear
                    });
                  }}
                  required
                >
                  <option value="">Select Class</option>
                  {masterClasses.map((classItem) => <option key={classItem._id} value={classItem._id}>{classItem.className} / {classItem.departmentName}</option>)}
                </select>
              </Field>
              <Field label="Enter Semester">
                <input className="input" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} placeholder="Semester 2 - 2024/2025" required />
              </Field>
              <Field label="Enter Academic Year">
                <input className="input" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} placeholder="2024/2025" required />
              </Field>
              <Field label="Status">
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </Field>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn-primary">Save Assignment</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

function ParticipationMetric({ label, value, color = 'text-huText' }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-black ${color}`}>{value}</p>
    </div>
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

function FilterInput({ placeholder, value, options, onChange }) {
  const listId = `${placeholder.toLowerCase().replace(/\s+/g, '-')}-options`;
  return (
    <>
      <input className="input" list={listId} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      <datalist id={listId}>
        {options.map((option) => <option key={option} value={option} />)}
      </datalist>
    </>
  );
}
