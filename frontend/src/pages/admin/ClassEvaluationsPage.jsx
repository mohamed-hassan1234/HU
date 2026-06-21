import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Award, Building2, Eye, Medal, RefreshCw, Star, Trophy, Users } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import { toast } from '../../utils/alerts';

export default function ClassEvaluationsPage() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ faculty: '', department: '', className: '', lecturerId: '', semester: '', academicYear: '' });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
      const response = await api.get('/class-evaluations/admin', { params });
      setData(response.data);
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Class evaluations failed to load' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const rankings = data?.classRankings || [];
  const totals = data?.totals || {};
  const best = data?.bestUniversityClass;

  return (
    <>
      <PageHeader
        title="Teacher Class Evaluations"
        subtitle="Review teacher reports class by class and identify the strongest classes across the university and each faculty."
        actions={<button className="btn-primary" onClick={load}><RefreshCw size={17} />Refresh Results</button>}
      />

      <section className="panel mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Object.keys(filters).map((key) => <input key={key} className="input" placeholder={key.replace(/([A-Z])/g, ' $1')} value={filters[key]} onChange={(event) => setFilters({ ...filters, [key]: event.target.value })} />)}
        </div>
        <div className="mt-3 flex justify-end"><button className="btn-secondary" onClick={load}>Apply Filters</button></div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Teacher Reports" value={totals.reports || 0} icon={Star} />
        <StatCard title="Evaluated Classes" value={totals.classes || 0} icon={Users} accent="blue" />
        <StatCard title="Faculties" value={totals.faculties || 0} icon={Building2} />
        <StatCard title="Average Class Score" value={`${totals.averageScore || 0}/5`} icon={Medal} accent="gold" />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
        <section className="overflow-hidden rounded-lg bg-gradient-to-br from-huGreen to-huGreenDark text-white shadow-soft">
          <div className="p-6">
            <Trophy size={30} className="text-yellow-300" />
            <p className="mt-8 text-xs font-bold uppercase text-white/65">Best Class in the University</p>
            <h2 className="mt-2 text-3xl font-black">{best?.className || 'Awaiting reports'}</h2>
            <p className="mt-1 text-sm text-white/75">{best?.faculty || 'Teacher reports will determine the ranking'}</p>
            {best ? <p className="mt-6 text-5xl font-black">{best.averageScore}<span className="text-xl text-white/70">/5</span></p> : null}
          </div>
          {best ? <div className="grid grid-cols-2 border-t border-white/15 bg-white/5"><WinnerMetric label="Attendance" value={`${best.attendancePercent}%`} /><WinnerMetric label="Course completion" value={`${best.courseCompletion}%`} /></div> : null}
        </section>

        <section className="panel p-5">
          <h2 className="font-bold text-huText">Class Ranking Overview</h2>
          {rankings.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rankings.slice(0, 10)} margin={{ top: 25, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="className" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Bar dataKey="averageScore" fill="#008751" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="grid h-[300px] place-items-center text-sm text-slate-500">No teacher class reports match these filters.</div>}
        </section>
      </div>

      <section className="panel mt-6 p-5">
        <h2 className="flex items-center gap-2 font-bold text-huText"><Award size={19} /> Best Class in Each Faculty</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(data?.facultyWinners || []).map((item) => (
            <div key={item.faculty} className="border-l-4 border-huBlue bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-huBlue">{item.faculty}</p>
              <div className="mt-2 flex items-end justify-between gap-3"><div><p className="text-xl font-black text-huText">{item.className}</p><p className="text-xs text-slate-500">{item.department}</p></div><b className="text-2xl text-huGreen">{item.averageScore}</b></div>
            </div>
          ))}
          {!(data?.facultyWinners || []).length ? <p className="text-sm text-slate-500">Faculty winners appear after teacher submissions.</p> : null}
        </div>
      </section>

      <section className="panel mt-6 overflow-hidden">
        <div className="border-b border-slate-100 p-5"><h2 className="font-bold text-huText">University Class Leaderboard</h2></div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600"><tr>{['Rank', 'Class', 'Faculty', 'Reports', 'Score', 'Completion', 'Attendance'].map((item) => <th key={item} className="px-4 py-3 font-semibold">{item}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rankings.map((item) => (
                <tr key={`${item.faculty}-${item.className}`}>
                  <td className="px-4 py-3"><span className={`grid h-8 w-8 place-items-center rounded-full font-black ${item.universityRank === 1 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>#{item.universityRank}</span></td>
                  <td className="px-4 py-3"><b className="text-huText">{item.className}</b><p className="text-xs text-slate-500">{item.department}</p></td>
                  <td className="px-4 py-3">{item.faculty}</td>
                  <td className="px-4 py-3">{item.reports}</td>
                  <td className="px-4 py-3 font-black text-huGreen">{item.averageScore}/5</td>
                  <td className="px-4 py-3">{item.courseCompletion}%</td>
                  <td className="px-4 py-3">{item.attendancePercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel mt-6 overflow-hidden">
        <div className="border-b border-slate-100 p-5"><h2 className="font-bold text-huText">Teacher Submissions</h2><p className="mt-1 text-sm text-slate-500">Open a report to inspect class quality, attendance, syllabus progress, top students, and teacher notes.</p></div>
        {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading reports...</p> : (
          <div className="divide-y divide-slate-100">
            {(data?.data || []).map((item) => (
              <div key={item._id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div><p className="font-bold text-huText">{item.className} / {item.courseCode} - {item.courseName}</p><p className="mt-1 text-xs text-slate-500">{item.lecturerName} &bull; {item.faculty} &bull; {new Date(item.submittedAt).toLocaleString()}</p></div>
                <div className="flex items-center gap-4"><b className="text-xl text-huGreen">{item.overallScore}/5</b><button className="btn-secondary" onClick={() => setSelected(item)}><Eye size={16} />View Report</button></div>
              </div>
            ))}
            {!(data?.data || []).length ? <p className="p-8 text-center text-sm text-slate-500">No teacher class evaluations submitted yet.</p> : null}
          </div>
        )}
      </section>

      {selected ? <ReportDrawer report={selected} onClose={() => setSelected(null)} /> : null}
    </>
  );
}

function ReportDrawer({ report, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-sm">
      <button className="absolute inset-0" onClick={onClose} aria-label="Close report" />
      <aside className="relative h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase text-huGreen">Teacher Class Report</p><h2 className="mt-1 text-2xl font-black text-huText">{report.className} / {report.courseName}</h2><p className="mt-1 text-sm text-slate-500">{report.lecturerName}</p></div><button className="btn-secondary" onClick={onClose}>Close</button></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2"><Detail label="Class performance" value={report.classPerformance} /><Detail label="Participation" value={report.participationQuality} /><Detail label="Attendance quality" value={report.attendanceQuality} /><Detail label="Attendance" value={`${report.attendancePercent}%`} /><Detail label="Course status" value={report.courseStatus.replace('_', ' ')} /><Detail label="Course completion" value={`${report.courseCompletion}%`} /></div>
        <h3 className="mt-7 font-bold text-huText">Top Students</h3>
        <div className="mt-3 space-y-2">{(report.topStudents || []).map((student) => <div key={student.studentId} className="flex items-center gap-3 bg-slate-50 p-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-huGreen text-sm font-black text-white">{student.position}</span><div><p className="font-bold text-slate-800">{student.studentName}</p><p className="text-xs text-slate-500">{student.studentId}</p></div></div>)}{!report.topStudents?.length ? <p className="text-sm text-slate-500">No students were announced.</p> : null}</div>
        <div className="mt-7 space-y-4"><Note label="Class Strengths" value={report.strengths} /><Note label="Areas for Improvement" value={report.improvements} /><Note label="Announcement" value={report.announcement} /></div>
      </aside>
    </div>
  );
}

function WinnerMetric({ label, value }) { return <div className="p-4"><p className="text-xs text-white/65">{label}</p><p className="mt-1 text-lg font-black">{value}</p></div>; }
function Detail({ label, value }) { return <div className="bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 font-black capitalize text-huText">{value}</p></div>; }
function Note({ label, value }) { return <section><h3 className="text-sm font-bold text-huText">{label}</h3><p className="mt-2 bg-slate-50 p-4 text-sm leading-6 text-slate-600">{value || 'No note provided.'}</p></section>; }
