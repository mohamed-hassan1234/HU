import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { AlertTriangle, Bell, BookOpen, ClipboardCheck, GraduationCap, Medal, Star, TrendingUp, Users } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import { toast } from '../../utils/alerts';

const colors = ['#008751', '#1E73BE', '#C9932A', '#006B3C'];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({});

  const load = () => {
    api.get('/dashboard/admin', { params: filters })
      .then((res) => setData(res.data))
      .catch((error) => toast.fire({ icon: 'error', title: error.response?.data?.message || 'Dashboard failed' }));
  };

  useEffect(() => {
    load();
  }, []);

  const totals = data?.totals || {};
  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        subtitle="University-wide analytics, rankings, reports, and early warnings for Hormuud University."
        actions={<button className="btn-primary" onClick={load}><TrendingUp size={16} />Refresh Analytics</button>}
      />

      <div className="panel mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
          {['semester', 'faculty', 'department', 'className', 'lecturerId', 'courseCode', 'academicYear'].map((key) => (
            <input key={key} className="input" placeholder={key} value={filters[key] || ''} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })} />
          ))}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input className="input" type="date" value={filters.dateFrom || ''} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
          <input className="input" type="date" value={filters.dateTo || ''} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
          <button className="btn-secondary" onClick={load}>Apply Filters</button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard title="Total Students" value={totals.students} icon={Users} />
        <StatCard title="Total Teachers" value={totals.lecturers} icon={GraduationCap} accent="blue" />
        <StatCard title="Total Courses" value={totals.courses} icon={BookOpen} />
        <StatCard title="Total Evaluations" value={totals.evaluations} icon={ClipboardCheck} accent="blue" />
        <StatCard title="Average Score" value={`${totals.averageSatisfactionScore || 0}/5`} icon={Star} />
        <StatCard title="Active Semesters" value={totals.activeSemesters || 0} icon={Medal} accent="gold" />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <ChartPanel title="Teacher Leaderboard" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={310}>
            <BarChart data={data?.teacherLeaderboard?.slice(0, 10) || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="teacher" hide />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Bar dataKey="averageScore" fill="#008751" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Participation">
          <ParticipationChart rows={data?.participationChart || []} rate={totals.participationRate || 0} />
        </ChartPanel>
        <ChartPanel title="Semester Trend">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data?.semesterTrends || []}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#1E73BE" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#1E73BE" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Area dataKey="average" stroke="#1E73BE" fill="url(#scoreGradient)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Faculty Comparison">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data?.facultyComparison || []} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" domain={[0, 5]} />
              <YAxis type="category" dataKey="name" width={120} />
              <Bar dataKey="average" fill="#1E73BE" radius={[0, 6, 6, 0]} />
              <Tooltip />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Course Analytics">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data?.courseSatisfaction?.slice(0, 8) || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" hide />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Bar dataKey="average" fill="#C9932A" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <AssignmentParticipation rows={data?.assignmentParticipation || []} />

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Ranking title="Top 10 Teachers" rows={data?.bestTeachers || []} positive />
        <Ranking title="Lowest Performing Teachers" rows={data?.lowestPerformingTeachers || []} />
        <Notifications activity={data?.activity || []} warnings={data?.earlyWarnings || []} />
      </div>
    </>
  );
}

function ParticipationChart({ rows, rate }) {
  const total = rows.reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (!total) return <div className="grid h-[310px] place-items-center text-sm text-slate-500">No eligible assignment submissions yet.</div>;
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} labelLine={false}>
            {rows.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
          </Pie>
          <Tooltip formatter={(value, name) => [`${value} students`, name]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[86px] text-center">
        <p className="text-2xl font-black text-huText">{rate}%</p>
        <p className="text-xs text-slate-500">of {total} eligible</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {rows.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />{item.name}</span>
            <b>{item.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssignmentParticipation({ rows }) {
  return (
    <section className="panel mt-6 overflow-hidden">
      <div className="border-b border-slate-100 p-5">
        <h2 className="font-bold text-huText">Evaluation Participation by Course Assignment</h2>
        <p className="mt-1 text-sm text-slate-500">Counts use only active students in each assigned class. Open Course Assignments to view student names and submission status.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>{['Course Assignment', 'Class', 'Teacher', 'Eligible', 'Submitted', 'Not Submitted', 'Participation'].map((item) => <th key={item} className="whitespace-nowrap px-4 py-3 font-semibold">{item}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((item) => (
              <tr key={item.assignmentId}>
                <td className="px-4 py-3"><b>{item.courseCode}</b><p className="text-xs text-slate-500">{item.courseName}</p></td>
                <td className="px-4 py-3">{item.className}</td>
                <td className="px-4 py-3">{item.lecturerName}</td>
                <td className="px-4 py-3 font-semibold">{item.eligible}</td>
                <td className="px-4 py-3 font-bold text-huGreen">{item.submitted}</td>
                <td className="px-4 py-3 font-bold text-huBlue">{item.pending}</td>
                <td className="min-w-40 px-4 py-3">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-huGreen" style={{ width: `${item.participationRate}%` }} /></div>
                  <p className="mt-1 text-xs font-semibold">{item.participationRate}%</p>
                </td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">No active course assignments match these filters.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ChartPanel({ title, children, className = '' }) {
  return (
    <div className={`panel p-5 ${className}`}>
      <h2 className="mb-4 font-bold text-huText">{title}</h2>
      {children}
    </div>
  );
}

function Ranking({ title, rows, positive = false }) {
  return (
    <div className="panel p-5">
      <h2 className="font-bold text-huText">{title}</h2>
      <div className="mt-4 space-y-2">
        {rows.length ? rows.map((row) => (
          <div key={`${title}-${row.teacher}`} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
            <div>
              <p className="font-semibold text-slate-800">#{row.rank} {row.teacher}</p>
              <p className="text-xs text-slate-500">{row.faculty} &bull; {row.totalEvaluations} evaluations</p>
            </div>
            <span className={`font-black ${positive ? 'text-huGreen' : 'text-amber-600'}`}>{row.averageScore}/5</span>
          </div>
        )) : <p className="text-sm text-slate-500">No ranking data yet.</p>}
      </div>
    </div>
  );
}

function Notifications({ activity, warnings }) {
  return (
    <div className="panel p-5">
      <h2 className="flex items-center gap-2 font-bold text-huText"><Bell size={18} /> Notifications</h2>
      <div className="mt-4 space-y-2">
        {warnings.slice(0, 3).map((item) => (
          <div key={item.name} className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mr-2 inline" size={15} /> {item.name} score {item.average}
          </div>
        ))}
        {activity.slice(0, 5).map((item) => (
          <div key={item._id} className="rounded-xl bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-slate-700">{item.action} {item.entity}</p>
            <p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
          </div>
        ))}
        {!warnings.length && !activity.length ? <p className="text-sm text-slate-500">No notifications yet.</p> : null}
      </div>
    </div>
  );
}
