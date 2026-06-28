import { lazy, Suspense, useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Download, Eye, FileDown, Filter } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';

const PdfDownloadButton = lazy(() => import('../../reports/PdfDownloadButton'));

const textFilters = ['courseCode', 'lecturerId', 'semester', 'academicYear'];
const colors = ['#008751', '#1E73BE', '#C9932A', '#dc2626', '#7c3aed'];

export default function ReportsPage() {
  const [query, setQuery] = useState({});
  const [reportModel, setReportModel] = useState(null);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(query).filter(([, value]) => value));
    try {
      const { data } = await api.get('/evaluations/report-model', { params });
      setReportModel(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([api.get('/faculties'), api.get('/departments'), api.get('/classes')]).then(([facultyRes, departmentRes, classRes]) => {
      setFaculties(facultyRes.data.data || []);
      setDepartments(departmentRes.data.data || []);
      setClasses(classRes.data.data || []);
    });
    load();
  }, []);

  const filteredDepartments = departments.filter((item) => !query.facultyId || String(item.faculty) === String(query.facultyId));
  const filteredClasses = classes.filter((item) => {
    if (query.departmentId) return String(item.department) === String(query.departmentId);
    if (query.facultyId) return String(item.faculty) === String(query.facultyId);
    return true;
  });

  const report = reportModel?.report || null;
  const participation = reportModel?.participation || { rows: [], totals: {} };
  const derived = reportModel?.derived || {
    bestLecturer: null,
    worstLecturer: null,
    bestCourse: null,
    worstCourse: null,
    recommendationRate: 0,
    attendanceRate: 0,
    recommendationBreakdown: [],
    attendanceBreakdown: [],
    evaluationTrend: [],
    radar: []
  };
  const participationRows = participation?.rows || [];

  const openStudent = async (row) => {
    const { data } = await api.get(`/evaluations/student/${row.studentId}`, { params: { ...query, assignmentId: row.assignmentId } });
    setSelectedStudent({ ...data, row });
  };

  const exportCsv = async () => {
    const response = await api.get('/evaluations/export-csv', { params: query, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'evaluation-report.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const selectedFaculty = faculties.find((item) => String(item._id) === String(query.facultyId));
  const selectedDepartment = departments.find((item) => String(item._id) === String(query.departmentId));
  const selectedClass = classes.find((item) => String(item._id) === String(query.classId));
  const pdfFileName = [
    'ctes-evaluation-report',
    selectedFaculty?.code || selectedFaculty?.name,
    selectedDepartment?.code || selectedDepartment?.name,
    selectedClass?.className,
    query.academicYear,
    query.semester
  ].filter(Boolean).join('-').replace(/\s+/g, '-').toLowerCase();

  return (
    <>
      <PageHeader
        title="Evaluation Reports"
        subtitle="Enterprise evaluation intelligence, participation tracking, rankings, analytics, and official printable reports."
        actions={<><button className="btn-secondary" onClick={exportCsv}><Download size={16} />Export CSV</button>{reportModel ? <Suspense fallback={<button className="btn-primary" disabled><FileDown size={16} />Preparing PDF</button>}><PdfDownloadButton model={reportModel} fileName={`${pdfFileName || 'ctes-evaluation-report'}.pdf`} /></Suspense> : <button className="btn-primary" disabled><FileDown size={16} />Download PDF</button>}</>}
      />

      <main>
        <section className="panel mb-5 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select className="input" value={query.facultyId || ''} onChange={(e) => setQuery({ ...query, facultyId: e.target.value, departmentId: '', classId: '' })}>
              <option value="">All Faculties</option>
              {faculties.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
            </select>
            <select className="input" value={query.departmentId || ''} onChange={(e) => setQuery({ ...query, departmentId: e.target.value, classId: '' })}>
              <option value="">All Departments</option>
              {filteredDepartments.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
            </select>
            <select className="input" value={query.classId || ''} onChange={(e) => setQuery({ ...query, classId: e.target.value })}>
              <option value="">All Classes</option>
              {filteredClasses.map((item) => <option key={item._id} value={item._id}>{item.className}</option>)}
            </select>
            <select className="input" value={query.status || ''} onChange={(e) => setQuery({ ...query, status: e.target.value })}>
              <option value="">All Students</option>
              <option value="evaluated">Evaluated</option>
              <option value="not_evaluated">Not Evaluated</option>
            </select>
            {textFilters.map((key) => <input key={key} className="input" placeholder={key} value={query[key] || ''} onChange={(e) => setQuery({ ...query, [key]: e.target.value })} />)}
            <button className="btn-primary" onClick={load}><Filter size={16} />Apply Filters</button>
          </div>
        </section>

        {loading ? <div className="panel p-8 text-center text-sm text-slate-500">Loading enterprise report...</div> : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Average Lecturer Score" value={report?.averageLecturerScore || 0} />
              <StatCard title="Average Course Score" value={report?.averageCourseScore || 0} accent="gold" />
              <StatCard title="Participation Rate" value={`${participation?.totals?.participationRate || report?.participationRate || 0}%`} />
              <StatCard title="Total Submissions" value={report?.totalSubmissions || 0} accent="gold" />
            </section>
            <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Evaluated Students" value={participation?.totals?.evaluated || 0} />
              <StatCard title="Not Evaluated Students" value={participation?.totals?.notEvaluated || 0} accent="gold" />
              <StatCard title="Possible Evaluations" value={participation?.totals?.possible || 0} />
              <StatCard title="Evaluation Completion" value={`${participation?.totals?.participationRate || 0}%`} accent="gold" />
            </section>
            <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Attendance Rate" value={`${derived.attendanceRate}%`} />
              <StatCard title="Recommendation Rate" value={`${derived.recommendationRate}%`} accent="gold" />
              <StatCard title="Best Lecturer" value={derived.bestLecturer?.name || 'N/A'} />
              <StatCard title="Worst Lecturer" value={derived.worstLecturer?.name || 'N/A'} accent="gold" />
            </section>
            <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Best Course" value={derived.bestCourse?.name || 'N/A'} />
              <StatCard title="Worst Course" value={derived.worstCourse?.name || 'N/A'} accent="gold" />
              <StatCard title="Best Class" value={report?.bestClass?.name || 'N/A'} />
              <StatCard title="Worst Class" value={report?.worstClass?.name || 'N/A'} accent="gold" />
            </section>
            <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Best Department" value={report?.bestDepartment?.name || 'N/A'} />
              <StatCard title="Worst Department" value={report?.worstDepartment?.name || 'N/A'} accent="gold" />
              <StatCard title="Best Faculty" value={report?.bestFaculty?.name || 'N/A'} />
              <StatCard title="Worst Faculty" value={report?.worstFaculty?.name || 'N/A'} accent="gold" />
            </section>

            <section className="mt-5 grid gap-4 xl:grid-cols-2">
              <ChartPanel title="Faculty Comparison"><HorizontalBar rows={report?.facultyComparison || []} /></ChartPanel>
              <ChartPanel title="Department Comparison"><HorizontalBar rows={report?.departmentComparison || []} color="#1E73BE" /></ChartPanel>
              <ChartPanel title="Class Comparison"><VerticalBar rows={report?.classComparison || []} /></ChartPanel>
              <ChartPanel title="Course Comparison"><VerticalBar rows={report?.courseSatisfaction || []} color="#C9932A" /></ChartPanel>
              <ChartPanel title="Participation Donut"><Donut rows={[{ name: 'Evaluated', value: participation?.totals?.evaluated || 0 }, { name: 'Not Evaluated', value: participation?.totals?.notEvaluated || 0 }]} /></ChartPanel>
              <ChartPanel title="Recommendation Trend"><Donut rows={derived.recommendationBreakdown} /></ChartPanel>
              <ChartPanel title="Attendance Trend"><AreaTrend rows={derived.attendanceBreakdown} /></ChartPanel>
              <ChartPanel title="Evaluation Trend"><LineTrend rows={derived.evaluationTrend} /></ChartPanel>
              <ChartPanel title="University Radar"><RadarSummary rows={derived.radar} /></ChartPanel>
            </section>

            <section className="mt-5 grid gap-4 lg:grid-cols-2">
              <Ranking title="Department Ranking" rows={report?.departmentComparison || []} />
              <Ranking title="Faculty Ranking" rows={report?.facultyComparison || []} />
              <Ranking title="Class Ranking" rows={report?.classComparison || []} />
              <Ranking title="Course Ranking" rows={report?.courseSatisfaction || []} />
              <Ranking title="Lecturer Ranking" rows={report?.lecturerRanking || []} />
              <SummaryTable report={report} participation={participation} derived={derived} />
            </section>

            <ParticipationTable rows={participationRows} onView={openStudent} />
          </>
        )}
      </main>
      {selectedStudent ? <StudentEvaluationDrawer details={selectedStudent} onClose={() => setSelectedStudent(null)} /> : null}
    </>
  );
}

function ChartPanel({ title, children }) {
  return <div className="panel p-5 break-inside-avoid"><h2 className="mb-4 font-bold text-huText">{title}</h2>{children}</div>;
}

function HorizontalBar({ rows, color = '#008751' }) {
  return <ResponsiveContainer width="100%" height={300}><BarChart data={rows.slice(0, 10)} layout="vertical" margin={{ left: 10, right: 20 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" domain={[0, 5]} /><YAxis type="category" dataKey="name" width={120} /><Tooltip /><Bar dataKey="average" fill={color} radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer>;
}

function VerticalBar({ rows, color = '#008751' }) {
  return <ResponsiveContainer width="100%" height={300}><BarChart data={rows.slice(0, 10)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" hide /><YAxis domain={[0, 5]} /><Tooltip /><Bar dataKey="average" fill={color} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>;
}

function Donut({ rows }) {
  return <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={rows} dataKey="value" nameKey="name" innerRadius={65} outerRadius={100} label>{rows.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>;
}

function AreaTrend({ rows }) {
  return <ResponsiveContainer width="100%" height={300}><AreaChart data={rows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Area type="monotone" dataKey="value" stroke="#1E73BE" fill="#1E73BE" fillOpacity={0.25} /></AreaChart></ResponsiveContainer>;
}

function LineTrend({ rows }) {
  return <ResponsiveContainer width="100%" height={300}><LineChart data={rows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="value" stroke="#008751" strokeWidth={3} /></LineChart></ResponsiveContainer>;
}

function RadarSummary({ rows }) {
  return <ResponsiveContainer width="100%" height={300}><RadarChart data={rows}><PolarGrid /><PolarAngleAxis dataKey="metric" /><Radar dataKey="value" stroke="#008751" fill="#008751" fillOpacity={0.25} /><Tooltip /></RadarChart></ResponsiveContainer>;
}

function Ranking({ title, rows }) {
  return (
    <div className="panel p-5 break-inside-avoid">
      <h2 className="font-bold text-huText">{title}</h2>
      <div className="mt-4 space-y-2">
        {rows.length ? rows.slice(0, 12).map((row) => (
          <div key={row.id || row.name} className="flex items-center justify-between rounded-md bg-slate-50 p-3 text-sm">
            <span className="font-medium text-slate-700">#{row.rank || '-'} {row.name}</span>
            <span className="font-bold text-huGreen">{row.average}/5</span>
          </div>
        )) : <p className="text-sm text-slate-500">No data yet.</p>}
      </div>
    </div>
  );
}

function SummaryTable({ report, participation, derived }) {
  const rows = [
    ['Completed Evaluations', participation?.totals?.evaluated || 0],
    ['Possible Evaluations', participation?.totals?.possible || 0],
    ['Participation Rate', `${participation?.totals?.participationRate || 0}%`],
    ['Attendance Rate', `${derived.attendanceRate}%`],
    ['Recommendation Rate', `${derived.recommendationRate}%`],
    ['Average Rating', report?.averageCourseScore || 0],
    ['Best Department', report?.bestDepartment?.name || 'N/A'],
    ['Worst Department', report?.worstDepartment?.name || 'N/A'],
    ['Best Faculty', report?.bestFaculty?.name || 'N/A'],
    ['Worst Faculty', report?.worstFaculty?.name || 'N/A']
  ];
  return <div className="panel overflow-hidden break-inside-avoid"><div className="border-b border-slate-100 p-5"><h2 className="font-bold text-huText">University Summary Table</h2></div><table className="min-w-full text-sm"><tbody className="divide-y divide-slate-100">{rows.map(([label, value]) => <tr key={label}><td className="px-4 py-3 font-semibold text-slate-600">{label}</td><td className="px-4 py-3 text-right font-bold text-huText">{value}</td></tr>)}</tbody></table></div>;
}

function ParticipationTable({ rows, onView }) {
  return (
    <section className="panel mt-5 overflow-hidden">
      <div className="border-b border-slate-100 p-5">
        <h2 className="font-bold text-huText">Student Evaluation Status</h2>
        <p className="mt-1 text-sm text-slate-500">Every expected student submission for the selected filters.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600"><tr>{['Student', 'ID', 'Faculty', 'Department', 'Class', 'Course', 'Attendance', 'Recommendation', 'Status', 'Action'].map((head) => <th key={head} className="whitespace-nowrap px-4 py-3 font-semibold">{head}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={`${row.assignmentId}-${row.studentId}`}>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-huText">{row.studentName}</td>
                <td className="whitespace-nowrap px-4 py-3">{row.studentId}</td>
                <td className="whitespace-nowrap px-4 py-3">{row.faculty}</td>
                <td className="whitespace-nowrap px-4 py-3">{row.department}</td>
                <td className="whitespace-nowrap px-4 py-3">{row.className}</td>
                <td className="whitespace-nowrap px-4 py-3"><b>{row.courseCode}</b><p className="text-xs text-slate-500">{row.courseName}</p></td>
                <td className="whitespace-nowrap px-4 py-3">{row.attendanceRate || '-'}</td>
                <td className="whitespace-nowrap px-4 py-3">{row.recommendation || '-'}</td>
                <td className="whitespace-nowrap px-4 py-3"><span className={`rounded-md px-2 py-1 text-xs font-bold ${row.status === 'evaluated' ? 'bg-emerald-50 text-huGreen' : 'bg-amber-50 text-amber-700'}`}>{row.status === 'evaluated' ? 'Evaluated' : 'Not Evaluated'}</span></td>
                <td className="whitespace-nowrap px-4 py-3"><button className="btn-secondary px-3" onClick={() => onView(row)}><Eye size={15} />View</button></td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan="10" className="px-4 py-8 text-center text-slate-500">No student participation data matches these filters.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StudentEvaluationDrawer({ details, onClose }) {
  const evaluation = details.data?.[0];
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-sm no-print">
      <button className="absolute inset-0" onClick={onClose} aria-label="Close details" />
      <aside className="relative h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-black text-huText">{details.student?.fullName || details.row.studentName}</h2><p className="mt-1 text-sm text-slate-500">{details.row.courseCode} / {details.row.className} / {details.row.department}</p></div><button className="btn-secondary" onClick={onClose}>Close</button></div>
        {!evaluation ? <div className="mt-6 rounded-lg bg-amber-50 p-4 text-sm font-semibold text-amber-700">This student has not submitted this evaluation yet.</div> : <EvaluationDetails evaluation={evaluation} />}
      </aside>
    </div>
  );
}

function EvaluationDetails({ evaluation }) {
  return <><div className="mt-6 grid gap-3 sm:grid-cols-2"><Info label="Course Score" value={`${evaluation.courseOverallRating || 0}/5`} /><Info label="Teacher Score" value={`${evaluation.lecturerOverallRating || 0}/5`} /><Info label="Recommendation" value={evaluation.recommendation} /><Info label="Submitted" value={new Date(evaluation.submittedAt).toLocaleString()} /></div><section className="mt-6"><h3 className="font-bold text-huText">Question Answers</h3><div className="mt-3 space-y-2">{(evaluation.responses || []).map((answer) => <div key={answer.questionId} className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-semibold text-slate-800">{answer.questionText || answer.questionId}</p><p className="mt-1 font-bold text-huGreen">{answer.rating || answer.answer}/5</p></div>)}</div></section><section className="mt-6"><h3 className="font-bold text-huText">Comments</h3><div className="mt-3 space-y-2">{Object.entries(evaluation.comments || {}).filter(([, value]) => value).map(([key, value]) => <div key={key} className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-semibold capitalize text-slate-700">{key}</p><p className="mt-1 text-slate-600">{value}</p></div>)}</div></section></>;
}

function Info({ label, value }) {
  return <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-800">{value || 'N/A'}</p></div>;
}
