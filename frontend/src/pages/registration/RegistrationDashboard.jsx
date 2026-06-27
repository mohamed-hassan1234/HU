import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Award, BookOpen, ClipboardCheck, GraduationCap, Star, TrendingUp, Users } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../utils/alerts';

const colors = ['#078B56', '#2E8BBD', '#C9932A', '#dc2626'];

export default function RegistrationDashboard() {
  const { profile } = useAuth();
  const [data, setData] = useState(null);

  const load = async () => {
    try {
      const response = await api.get('/dashboard/registration');
      setData(response.data);
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Dashboard failed to load' });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totals = data?.totals || {};
  const bestTeacher = data?.bestTeachers?.find((item) => item.totalEvaluations > 0);
  const worstTeacher = data?.lowestPerformingTeachers?.find((item) => item.totalEvaluations > 0);
  const bestCourse = data?.bestCourses?.find((item) => item.totalEvaluations > 0);
  const worstCourse = data?.worstCourses?.find((item) => item.totalEvaluations > 0);

  return (
    <>
      <PageHeader
        title="Registration Dashboard"
        subtitle={`${profile?.department || 'Department'} statistics, participation, rankings, and evaluation trends.`}
        actions={<button className="btn-primary" onClick={load}><TrendingUp size={16} />Refresh</button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard title="Students" value={totals.students} icon={Users} />
        <StatCard title="Lecturers" value={totals.lecturers} icon={GraduationCap} accent="blue" />
        <StatCard title="Courses" value={totals.courses} icon={BookOpen} />
        <StatCard title="Assignments" value={data?.assignmentParticipation?.length || 0} icon={ClipboardCheck} accent="blue" />
        <StatCard title="Average Rating" value={`${totals.averageSatisfactionScore || 0}/5`} icon={Star} />
        <StatCard title="Participation" value={`${totals.participationRate || 0}%`} icon={Award} accent="gold" />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-4">
        <RankCard title="Best Lecturer" item={bestTeacher?.teacher} score={bestTeacher?.averageScore} />
        <RankCard title="Worst Lecturer" item={worstTeacher?.teacher} score={worstTeacher?.averageScore} danger />
        <RankCard title="Best Course" item={bestCourse?.course} score={bestCourse?.averageScore} />
        <RankCard title="Worst Course" item={worstCourse?.course} score={worstCourse?.averageScore} danger />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Chart title="Evaluation Completion and Participation">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data?.participationChart || []} dataKey="value" nameKey="name" outerRadius={95} label>
                {(data?.participationChart || []).map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Chart>
        <Chart title="Trend Charts">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data?.semesterTrends || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Line type="monotone" dataKey="average" stroke="#078B56" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </Chart>
        <Chart title="Lecturer Rankings">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.teacherLeaderboard?.slice(0, 8) || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="teacher" hide />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Bar dataKey="averageScore" fill="#078B56" />
            </BarChart>
          </ResponsiveContainer>
        </Chart>
        <Chart title="Course Rankings">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.bestCourses?.slice(0, 8) || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="course" hide />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Bar dataKey="averageScore" fill="#C9932A" />
            </BarChart>
          </ResponsiveContainer>
        </Chart>
      </div>

      <section className="panel mt-6 overflow-hidden">
        <div className="border-b border-slate-100 p-5"><h2 className="font-bold text-huText">Assignment Response Rate</h2></div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600"><tr>{['Course', 'Class', 'Lecturer', 'Eligible', 'Submitted', 'Response Rate'].map((item) => <th key={item} className="px-4 py-3 font-semibold">{item}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.assignmentParticipation || []).map((item) => (
                <tr key={item.assignmentId}>
                  <td className="px-4 py-3"><b>{item.courseCode}</b><p className="text-xs text-slate-500">{item.courseName}</p></td>
                  <td className="px-4 py-3">{item.className}</td>
                  <td className="px-4 py-3">{item.lecturerName}</td>
                  <td className="px-4 py-3">{item.eligible}</td>
                  <td className="px-4 py-3">{item.submitted}</td>
                  <td className="px-4 py-3 font-bold text-huGreen">{item.participationRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Chart({ title, children }) {
  return <div className="panel p-5"><h2 className="mb-4 font-bold text-huText">{title}</h2>{children}</div>;
}

function RankCard({ title, item, score, danger = false }) {
  return (
    <div className="panel p-5">
      <p className="text-xs font-bold uppercase text-slate-500">{title}</p>
      <p className="mt-3 truncate text-lg font-black text-huText">{item || 'N/A'}</p>
      <p className={`mt-2 text-2xl font-black ${danger ? 'text-red-600' : 'text-huGreen'}`}>{score ? `${score}/5` : '-'}</p>
    </div>
  );
}
