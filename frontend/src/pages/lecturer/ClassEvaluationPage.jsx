import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, BookCheck, CheckCircle2, ClipboardCheck, Save, Users } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import SearchableSelect from '../../components/SearchableSelect';
import { toast } from '../../utils/alerts';

const qualities = ['excellent', 'good', 'average', 'poor'];
const courseStatuses = ['completed', 'in_progress', 'remaining'];
const emptyForm = {
  assignment: '',
  classPerformance: 'good',
  courseStatus: 'in_progress',
  courseCompletion: 75,
  attendanceQuality: 'good',
  attendancePercent: 80,
  participationQuality: 'good',
  topStudents: ['', '', ''],
  strengths: '',
  improvements: '',
  announcement: ''
};

const formFromReport = (report, assignment) => ({
  assignment,
  classPerformance: report.classPerformance,
  courseStatus: report.courseStatus,
  courseCompletion: report.courseCompletion,
  attendanceQuality: report.attendanceQuality,
  attendancePercent: report.attendancePercent,
  participationQuality: report.participationQuality,
  topStudents: [0, 1, 2].map((index) => report.topStudents?.[index]?.studentId || ''),
  strengths: report.strengths || '',
  improvements: report.improvements || '',
  announcement: report.announcement || ''
});

export default function ClassEvaluationPage() {
  const [assignments, setAssignments] = useState([]);
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [optionsRes, reportsRes] = await Promise.all([
        api.get('/class-evaluations/options'),
        api.get('/class-evaluations/mine')
      ]);
      const options = optionsRes.data.assignments || [];
      setAssignments(options);
      const savedReports = reportsRes.data.data || [];
      setReports(savedReports);
      setForm((current) => {
        const assignment = current.assignment || options[0]?._id || '';
        const existing = savedReports.find((item) => String(item.assignment) === assignment);
        return existing ? formFromReport(existing, assignment) : { ...current, assignment };
      });
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Class evaluation workspace failed to load' });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const activeAssignment = useMemo(
    () => assignments.find((item) => item._id === form.assignment),
    [assignments, form.assignment]
  );

  const selectAssignment = (assignmentId) => {
    const existing = reports.find((item) => item.assignment === assignmentId || item.assignment?._id === assignmentId);
    setForm(existing ? formFromReport(existing, assignmentId) : { ...emptyForm, assignment: assignmentId });
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.assignment) return;
    setSaving(true);
    try {
      await api.post('/class-evaluations', {
        ...form,
        topStudents: form.topStudents.filter(Boolean)
      });
      toast.fire({ icon: 'success', title: 'Class evaluation submitted' });
      await load();
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Class evaluation failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Class Evaluation" subtitle="Evaluate only your assigned classes and recognize their strongest students." />
      {!assignments.length ? (
        <div className="panel p-8 text-center text-sm text-slate-500">No active course class is assigned to your account.</div>
      ) : (
        <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <section className="panel p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-huGreen/10 text-huGreen"><BookCheck size={20} /></span>
                <div><h2 className="font-bold text-huText">Assigned Course and Class</h2><p className="text-sm text-slate-500">Choose the exact assignment this report belongs to.</p></div>
              </div>
              <SearchableSelect
                className="mt-4"
                value={form.assignment}
                onChange={selectAssignment}
                options={assignments.map((item) => ({
                  value: item._id,
                  label: `${item.courseCode} - ${item.courseName} / ${item.className} / ${item.semester}`
                }))}
                placeholder="Select Assignment"
                label="Assigned Course and Class"
                required
              />
              {activeAssignment ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Info label="Class" value={activeAssignment.className} />
                  <Info label="Academic Year" value={activeAssignment.academicYear} />
                  <Info label="Active Students" value={activeAssignment.students?.length || 0} />
                </div>
              ) : null}
            </section>

            <section className="panel p-5">
              <h2 className="flex items-center gap-2 font-bold text-huText"><ClipboardCheck size={19} /> Class Quality</h2>
              <div className="mt-5 space-y-5">
                <Segment label="Overall class performance" value={form.classPerformance} options={qualities} onChange={(value) => setForm({ ...form, classPerformance: value })} />
                <Segment label="Student participation" value={form.participationQuality} options={qualities} onChange={(value) => setForm({ ...form, participationQuality: value })} />
                <Segment label="Attendance quality" value={form.attendanceQuality} options={qualities} onChange={(value) => setForm({ ...form, attendanceQuality: value })} />
              </div>
            </section>

            <section className="panel p-5">
              <h2 className="flex items-center gap-2 font-bold text-huText"><CheckCircle2 size={19} /> Course Delivery and Attendance</h2>
              <div className="mt-5 space-y-6">
                <Segment label="Course syllabus status" value={form.courseStatus} options={courseStatuses} onChange={(value) => setForm({ ...form, courseStatus: value })} />
                <RangeField label="Course completion" value={form.courseCompletion} onChange={(value) => setForm({ ...form, courseCompletion: value })} />
                <RangeField label="Class attendance" value={form.attendancePercent} onChange={(value) => setForm({ ...form, attendancePercent: value })} />
              </div>
            </section>

            <section className="panel p-5">
              <h2 className="flex items-center gap-2 font-bold text-huText"><Award size={19} /> Top Students</h2>
              <p className="mt-1 text-sm text-slate-500">Select up to three students from this class in podium order.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {['1st Place', '2nd Place', '3rd Place'].map((label, index) => (
                  <label key={label} className="block">
                    <span className="mb-1 block text-xs font-bold uppercase text-slate-500">{label}</span>
                    <SearchableSelect
                      value={form.topStudents[index]}
                      onChange={(value) => {
                        const next = [...form.topStudents];
                        next[index] = value;
                        setForm({ ...form, topStudents: next });
                      }}
                      options={(activeAssignment?.students || []).map((student) => ({
                        value: student.studentId,
                        label: `${student.studentId} - ${student.studentName}`,
                        disabled: form.topStudents.some((id, selectedIndex) => selectedIndex !== index && id === student.studentId)
                      }))}
                      placeholder="Not selected"
                      label={label}
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="panel p-5">
              <h2 className="font-bold text-huText">Teacher Notes</h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <TextField label="Class strengths" value={form.strengths} onChange={(value) => setForm({ ...form, strengths: value })} placeholder="Students participate actively and complete practical work." />
                <TextField label="Areas for improvement" value={form.improvements} onChange={(value) => setForm({ ...form, improvements: value })} placeholder="Assignments and attendance need closer follow-up." />
              </div>
              <TextField label="Top student announcement" value={form.announcement} onChange={(value) => setForm({ ...form, announcement: value })} placeholder="Recognition message for the selected students." className="mt-4" />
              <div className="mt-5 flex justify-end"><button className="btn-primary" disabled={saving}><Save size={17} />{saving ? 'Submitting...' : 'Submit Class Evaluation'}</button></div>
            </section>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
            <div className="panel overflow-hidden">
              <div className="bg-gradient-to-br from-huGreen to-huGreenDark p-5 text-white">
                <Users size={24} />
                <p className="mt-4 text-xs font-bold uppercase text-white/70">Current Report</p>
                <h2 className="mt-1 text-xl font-black">{activeAssignment?.className}</h2>
                <p className="mt-1 text-sm text-white/80">{activeAssignment?.courseName}</p>
              </div>
              <div className="space-y-3 p-5 text-sm">
                <SummaryRow label="Performance" value={form.classPerformance} />
                <SummaryRow label="Course completion" value={`${form.courseCompletion}%`} />
                <SummaryRow label="Attendance" value={`${form.attendancePercent}%`} />
                <SummaryRow label="Top students" value={form.topStudents.filter(Boolean).length} />
              </div>
            </div>
            <div className="panel p-5">
              <h2 className="font-bold text-huText">My Submitted Reports</h2>
              <div className="mt-4 space-y-3">
                {reports.map((item) => (
                  <motion.button whileHover={{ x: 3 }} type="button" key={item._id} onClick={() => selectAssignment(String(item.assignment))} className="w-full border-l-2 border-huGreen py-1 pl-3 text-left">
                    <p className="text-sm font-bold text-slate-800">{item.className} / {item.courseCode}</p>
                    <p className="text-xs capitalize text-slate-500">{item.classPerformance} &bull; {item.courseCompletion}% complete</p>
                  </motion.button>
                ))}
                {!reports.length ? <p className="text-sm text-slate-500">No class reports submitted yet.</p> : null}
              </div>
            </div>
          </aside>
        </form>
      )}
    </>
  );
}

function Segment({ label, value, options, onChange }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-700">{label}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {options.map((option) => <button type="button" key={option} onClick={() => onChange(option)} className={`rounded-lg border px-3 py-2 text-sm font-bold capitalize transition ${value === option ? 'border-huGreen bg-huGreen text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-huGreen/40'}`}>{option.replace('_', ' ')}</button>)}
      </div>
    </div>
  );
}

function RangeField({ label, value, onChange }) {
  return <label className="block"><span className="flex justify-between text-sm font-semibold text-slate-700"><span>{label}</span><b className="text-huGreen">{value}%</b></span><input className="mt-3 w-full accent-huGreen" type="range" min="0" max="100" step="5" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function TextField({ label, value, onChange, placeholder, className = '' }) {
  return <label className={`block ${className}`}><span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span><textarea className="input min-h-24" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function Info({ label, value }) {
  return <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 font-bold text-huText">{value}</p></div>;
}

function SummaryRow({ label, value }) {
  return <div className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0"><span className="text-slate-500">{label}</span><b className="capitalize text-huText">{value}</b></div>;
}
