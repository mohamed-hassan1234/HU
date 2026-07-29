import { useEffect, useMemo, useState } from 'react';
import { Download, Eye, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import BulkImportWizard from '../../components/BulkImportWizard';
import SearchableSelect from '../../components/SearchableSelect';
import { confirmDelete, toast } from '../../utils/alerts';

const blankForm = {
  assignmentId: '',
  assignmentTitle: '',
  assignmentDescription: '',
  courseCode: '',
  lecturerId: '',
  classId: '',
  assignmentDate: '',
  dueDate: '',
  assignmentMode: 'class',
  assignedStudents: [],
  semester: '',
  academicYear: '',
  status: 'active'
};

const today = () => new Date().toISOString().slice(0, 10);
const safeText = (value) => String(value ?? '').trim();
const dateOnly = (value) => safeText(value).split('T')[0];
const optionText = (...values) => values.map(safeText).filter(Boolean).join(' ');

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [masterClasses, setMasterClasses] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState('');
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [filters, setFilters] = useState({ courseCode: '', lecturerId: '', classId: '', semester: '', academicYear: '', status: '' });
  const [form, setForm] = useState(blankForm);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [participation, setParticipation] = useState(null);
  const [participationLoading, setParticipationLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
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
    setOptionsLoading(true);
    setOptionsError('');
    Promise.all([
      api.get('/courses', { params: { limit: 500 } }),
      api.get('/lecturers', { params: { limit: 500 } }),
      api.get('/classes')
    ]).then(([courseRes, lecturerRes, masterClassesRes]) => {
      setCourses(courseRes.data.data || []);
      setLecturers(lecturerRes.data.data || []);
      setMasterClasses(masterClassesRes.data.data || []);
    }).catch((error) => {
      console.error('Failed to load assignment form options', error);
      setOptionsError(error.response?.data?.message || 'Unable to load assignment options. Please try again.');
      toast.fire({ icon: 'error', title: 'Failed to load assignment options' });
    }).finally(() => {
      setOptionsLoading(false);
    });
  }, []);

  useEffect(() => {
    loadAssignments();
  }, []);

  useEffect(() => {
    if (!modalOpen || !form.classId) {
      setClassStudents([]);
      setStudentsError('');
      setStudentsLoading(false);
      return;
    }

    let cancelled = false;
    setStudentsLoading(true);
    setStudentsError('');
    api.get('/students', { params: { classId: form.classId, status: 'active', limit: 5000 } })
      .then(({ data }) => {
        if (cancelled) return;
        const students = data.data || [];
        setClassStudents(students);
        const validIds = new Set(students.map((student) => student.studentId));
        setForm((current) => ({
          ...current,
          assignedStudents: (current.assignedStudents || []).filter((studentId) => validIds.has(studentId))
        }));
      })
      .catch((error) => {
        if (cancelled) return;
        setClassStudents([]);
        setStudentsError(error.response?.data?.message || 'Unable to load students for this class. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setStudentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.classId, modalOpen]);

  const semesters = useMemo(() => [...new Set(assignments.map((item) => item.semester).filter(Boolean))], [assignments]);
  const years = useMemo(() => [...new Set(assignments.map((item) => item.academicYear).filter(Boolean))], [assignments]);
  const activeClasses = useMemo(() => masterClasses.filter((item) => item.status !== 'inactive'), [masterClasses]);
  const courseOptions = useMemo(() => courses.map((course) => ({
    value: course.courseCode,
    label: `${course.courseCode} - ${course.courseName}`,
    searchText: optionText(course.courseName, course.department, course.faculty)
  })), [courses]);
  const lecturerOptions = useMemo(() => lecturers.map((lecturer) => ({
    value: lecturer.lecturerId,
    label: `${lecturer.lecturerId} - ${lecturer.fullName}`,
    searchText: optionText(lecturer.employeeId, lecturer.email, lecturer.phoneNumber, lecturer.department, lecturer.faculty)
  })), [lecturers]);
  const classOptions = useMemo(() => activeClasses.map((classItem) => ({
    value: classItem._id,
    label: `${classItem.className} / ${classItem.departmentName} / ${classItem.semester} / ${classItem.academicYear}`,
    searchText: optionText(classItem.className, classItem.departmentName, classItem.facultyName, classItem.semester, classItem.academicYear)
  })), [activeClasses]);
  const filterClassOptions = useMemo(() => masterClasses.map((classItem) => ({
    value: classItem._id,
    label: `${classItem.className} / ${classItem.departmentName} / ${classItem.semester} / ${classItem.academicYear}${classItem.status === 'inactive' ? ' (Closed)' : ''}`,
    searchText: optionText(classItem.className, classItem.departmentName, classItem.facultyName, classItem.semester, classItem.academicYear, classItem.status)
  })), [masterClasses]);
  const selectedClass = useMemo(
    () => masterClasses.find((item) => String(item._id) === String(form.classId)),
    [form.classId, masterClasses]
  );
  const filteredClassStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return classStudents;
    return classStudents.filter((student) =>
      optionText(student.fullName, student.studentId, student.className, student.phoneNumber).toLowerCase().includes(query)
    );
  }, [classStudents, studentSearch]);

  const openCreate = () => {
    setEditing(null);
    setStudentSearch('');
    setClassStudents([]);
    setForm({
      ...blankForm,
      assignmentId: `ASN-${Date.now().toString().slice(-6)}`,
      assignmentDate: today()
    });
    setModalOpen(true);
  };

  const openEdit = (assignment) => {
    setEditing(assignment);
    setStudentSearch('');
    setForm({
      assignmentId: assignment.assignmentId,
      assignmentTitle: assignment.assignmentTitle || `${assignment.courseCode} - ${assignment.className}`,
      assignmentDescription: assignment.assignmentDescription || '',
      courseCode: assignment.courseCode,
      lecturerId: assignment.lecturerId,
      classId: assignment.classId || '',
      assignmentDate: dateOnly(assignment.assignmentDate),
      dueDate: dateOnly(assignment.dueDate),
      assignmentMode: assignment.assignmentMode || (assignment.assignedStudents?.length ? 'students' : 'class'),
      assignedStudents: assignment.assignedStudents || [],
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
    if (form.dueDate && form.assignmentDate && form.dueDate < form.assignmentDate) {
      toast.fire({ icon: 'error', title: 'Due date cannot be earlier than the assignment date' });
      return;
    }
    if (form.assignmentMode === 'students' && !form.assignedStudents.length) {
      toast.fire({ icon: 'error', title: 'Please select at least one student' });
      return;
    }
    const payload = {
      ...form,
      assignedStudents: form.assignmentMode === 'students' ? form.assignedStudents : []
    };
    try {
      if (editing) await api.put(`/assignments/${editing._id}`, payload);
      else await api.post('/assignments', payload);
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
            <button className="btn-secondary" onClick={() => setImportOpen(true)}><Upload size={16} />Import Excel/CSV</button>
            <button className="btn-secondary" onClick={exportCsv}><Download size={16} />Export Assignment CSV</button>
          </>
        }
      />

      <div className="panel mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          <SearchableSelect
            value={filters.courseCode}
            onChange={(value) => setFilters({ ...filters, courseCode: value })}
            options={courseOptions}
            placeholder="All Courses"
            label="Filter by course"
            loading={optionsLoading}
            error={optionsError}
          />
          <SearchableSelect
            value={filters.lecturerId}
            onChange={(value) => setFilters({ ...filters, lecturerId: value })}
            options={lecturerOptions}
            placeholder="All Lecturers"
            label="Filter by lecturer"
            loading={optionsLoading}
            error={optionsError}
          />
          <SearchableSelect
            value={filters.classId}
            onChange={(value) => setFilters({ ...filters, classId: value })}
            options={filterClassOptions}
            placeholder="All Classes"
            label="Filter by class"
            loading={optionsLoading}
            error={optionsError}
          />
          <FilterInput placeholder="Semester" value={filters.semester} options={semesters} onChange={(value) => setFilters({ ...filters, semester: value })} />
          <FilterInput placeholder="Academic Year" value={filters.academicYear} options={years} onChange={(value) => setFilters({ ...filters, academicYear: value })} />
          <SearchableSelect
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value })}
            options={['active', 'inactive']}
            placeholder="All Statuses"
            label="Filter by status"
          />
          <button className="btn-primary" onClick={loadAssignments}>Apply Filters</button>
        </div>
      </div>

      <div className="panel overflow-hidden">
        {loading ? <div className="p-8 text-center text-sm text-stone-500">Loading assignments...</div> : assignments.length === 0 ? <div className="p-4"><EmptyState /></div> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200 text-sm">
              <thead className="bg-stone-50">
                <tr>
                  {['Assignment ID', 'Title', 'Course Code', 'Course Name', 'Class', 'Lecturer ID', 'Lecturer Name', 'Assignment Date', 'Due Date', 'Students', 'Status', 'Actions'].map((head) => (
                    <th key={head} className="whitespace-nowrap px-4 py-3 text-left font-semibold text-stone-600">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {assignments.map((assignment) => (
                  <tr key={assignment._id}>
                    <td className="whitespace-nowrap px-4 py-3">{assignment.assignmentId}</td>
                    <td className="whitespace-nowrap px-4 py-3">{assignment.assignmentTitle || `${assignment.courseCode} - ${assignment.className}`}</td>
                    <td className="whitespace-nowrap px-4 py-3">{assignment.courseCode}</td>
                    <td className="whitespace-nowrap px-4 py-3">{assignment.courseName}</td>
                    <td className="whitespace-nowrap px-4 py-3">{assignment.className}</td>
                    <td className="whitespace-nowrap px-4 py-3">{assignment.lecturerId}</td>
                    <td className="whitespace-nowrap px-4 py-3">{assignment.lecturerName}</td>
                    <td className="whitespace-nowrap px-4 py-3">{dateOnly(assignment.assignmentDate) || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3">{dateOnly(assignment.dueDate) || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3">{assignment.assignedStudentCount ?? (assignment.assignmentMode === 'students' ? assignment.assignedStudents?.length || 0 : '-')}</td>
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
                <h2 className="text-xl font-black text-huText">{participation.assignment.assignmentTitle || `${participation.assignment.courseCode} - ${participation.assignment.courseName}`}</h2>
                <p className="mt-1 text-sm text-slate-500">{participation.assignment.className} &bull; {participation.assignment.lecturerName} &bull; {dateOnly(participation.assignment.assignmentDate) || 'No assignment date'} &bull; Due {dateOnly(participation.assignment.dueDate) || 'not set'}</p>
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
                      <tr>{['Student', 'Student ID', 'Class', 'Status', 'Submitted At', 'Course Score', 'Teacher Score'].map((item) => <th key={item} className="whitespace-nowrap px-4 py-3 font-semibold">{item}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(participation.students || []).map((student) => (
                        <tr key={student.studentId}>
                          <td className="px-4 py-3 font-semibold text-slate-800">{student.studentName}</td>
                          <td className="px-4 py-3">{student.studentId}</td>
                          <td className="px-4 py-3">{student.className || participation.assignment.className}</td>
                          <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${student.status === 'submitted' ? 'bg-huGreen/10 text-huGreen' : 'bg-huBlue/10 text-huBlue'}`}>{student.status === 'submitted' ? 'Submitted' : 'Not submitted'}</span></td>
                          <td className="whitespace-nowrap px-4 py-3">{student.submittedAt ? new Date(student.submittedAt).toLocaleString() : '-'}</td>
                          <td className="px-4 py-3">{student.courseScore ? `${student.courseScore}/5` : '-'}</td>
                          <td className="px-4 py-3">{student.teacherScore ? `${student.teacherScore}/5` : '-'}</td>
                        </tr>
                      ))}
                      {!participation.students?.length ? (
                        <tr><td colSpan="7" className="px-4 py-8 text-center text-sm text-slate-500">No students are registered in this class.</td></tr>
                      ) : null}
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
              <Field label="Assignment Title"><input className="input" value={form.assignmentTitle} onChange={(e) => setForm({ ...form, assignmentTitle: e.target.value })} required /></Field>
              <Field label="Step 1: Select Course">
                <SearchableSelect
                  value={form.courseCode}
                  onChange={(value) => setForm({ ...form, courseCode: value })}
                  options={courseOptions}
                  placeholder="Select Course"
                  label="Select Course"
                  loading={optionsLoading}
                  error={optionsError}
                  required
                />
              </Field>
              <Field label="Step 2: Select Lecturer">
                <SearchableSelect
                  value={form.lecturerId}
                  onChange={(value) => setForm({ ...form, lecturerId: value })}
                  options={lecturerOptions}
                  placeholder="Select Lecturer"
                  label="Select Lecturer"
                  loading={optionsLoading}
                  error={optionsError}
                  required
                />
              </Field>
              <Field label="Step 3: Select Class">
                <SearchableSelect
                  value={form.classId}
                  onChange={(value) => {
                    const classItem = activeClasses.find((item) => String(item._id) === String(value));
                    setForm({
                      ...form,
                      classId: value,
                      assignmentMode: 'class',
                      assignedStudents: [],
                      semester: classItem?.semester || form.semester,
                      academicYear: classItem?.academicYear || form.academicYear
                    });
                  }}
                  options={classOptions}
                  placeholder="Select Class"
                  label="Select Class"
                  loading={optionsLoading}
                  error={optionsError}
                  noResultsText="No active classes were found."
                  required
                />
              </Field>
              <Field label="Assignment Date">
                <input className="input" type="date" value={form.assignmentDate} onChange={(e) => setForm({ ...form, assignmentDate: e.target.value })} required />
              </Field>
              <Field label="Due Date">
                <input className="input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
              </Field>
              <Field label="Enter Semester">
                <input className="input" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} placeholder="Semester 2 - 2024/2025" required />
              </Field>
              <Field label="Enter Academic Year">
                <input className="input" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} placeholder="2024/2025" required />
              </Field>
              <Field label="Status">
                <SearchableSelect
                  value={form.status}
                  onChange={(value) => setForm({ ...form, status: value })}
                  options={['active', 'inactive']}
                  placeholder="Select Status"
                  label="Status"
                />
              </Field>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase text-stone-500">Description</span>
                <textarea className="input min-h-24" value={form.assignmentDescription} onChange={(e) => setForm({ ...form, assignmentDescription: e.target.value })} />
              </label>
              <div className="sm:col-span-2">
                <StudentAssignmentPicker
                  students={classStudents}
                  filteredStudents={filteredClassStudents}
                  selectedClass={selectedClass}
                  selectedIds={form.assignedStudents}
                  assignmentMode={form.assignmentMode}
                  search={studentSearch}
                  loading={studentsLoading}
                  error={studentsError}
                  onModeChange={(assignmentMode) => setForm({
                    ...form,
                    assignmentMode,
                    assignedStudents: assignmentMode === 'class' ? [] : form.assignedStudents
                  })}
                  onSearchChange={setStudentSearch}
                  onToggle={(studentId) => {
                    const selected = new Set(form.assignedStudents);
                    if (selected.has(studentId)) selected.delete(studentId);
                    else selected.add(studentId);
                    setForm({ ...form, assignmentMode: 'students', assignedStudents: [...selected] });
                  }}
                  onClear={() => setForm({ ...form, assignedStudents: [] })}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn-primary">Save Assignment</button>
            </div>
          </form>
        </div>
      ) : null}
      {importOpen ? (
        <BulkImportWizard
          title="Course Assignments"
          endpoint="/assignments"
          onClose={() => setImportOpen(false)}
          onImported={loadAssignments}
          previewColumns={[
            { header: 'Assignment ID', key: 'assignmentId' },
            { header: 'Course', key: 'courseCode' },
            { header: 'Class', key: 'className' },
            { header: 'Lecturer', key: 'lecturerId' },
            { header: 'Semester', key: 'semester' },
            { header: 'Academic Year', key: 'academicYear' }
          ]}
        />
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

function StudentAssignmentPicker({
  students,
  filteredStudents,
  selectedClass,
  selectedIds,
  assignmentMode,
  search,
  loading,
  error,
  onModeChange,
  onSearchChange,
  onToggle,
  onClear
}) {
  const selected = new Set(selectedIds || []);

  return (
    <div className="rounded-md border border-slate-200">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-stone-500">Assigned Students</p>
          <p className="mt-1 text-sm text-slate-600">{selectedClass ? selectedClass.className : 'Select a class first'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={assignmentMode === 'class' ? 'btn-primary px-3 py-2 text-xs' : 'btn-secondary px-3 py-2 text-xs'}
            onClick={() => onModeChange('class')}
            disabled={!selectedClass}
          >
            Entire Class
          </button>
          <button
            type="button"
            className={assignmentMode === 'students' ? 'btn-primary px-3 py-2 text-xs' : 'btn-secondary px-3 py-2 text-xs'}
            onClick={() => onModeChange('students')}
            disabled={!selectedClass}
          >
            Selected Students
          </button>
        </div>
      </div>

      {assignmentMode === 'students' ? (
        <>
          <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                className="input !py-2 !pl-9"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search students"
                disabled={!selectedClass || loading}
              />
            </div>
            {selected.size ? (
              <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={onClear}>
                <X size={14} />
                Clear
              </button>
            ) : null}
          </div>
          <div className="max-h-56 overflow-y-auto p-2">
            {!selectedClass ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">Please select a class.</p>
            ) : loading ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">Loading students...</p>
            ) : error ? (
              <p className="px-3 py-6 text-center text-sm text-red-600">{error}</p>
            ) : !students.length ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">No students are registered in this class.</p>
            ) : !filteredStudents.length ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">No student matches your search.</p>
            ) : (
              <div className="space-y-1">
                {filteredStudents.map((student) => (
                  <label key={student.studentId} className="flex cursor-pointer items-center gap-3 rounded px-3 py-2 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-huGreen"
                      checked={selected.has(student.studentId)}
                      onChange={() => onToggle(student.studentId)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-700">{student.fullName}</span>
                      <span className="block truncate text-xs text-slate-500">{student.studentId} &bull; {student.className}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
            {selected.size} selected
          </div>
        </>
      ) : (
        <p className="p-3 text-sm text-slate-600">
          {selectedClass
            ? `${students.length || 0} active students will be included from this class.`
            : 'Select a class to resolve the class roster.'}
        </p>
      )}
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
