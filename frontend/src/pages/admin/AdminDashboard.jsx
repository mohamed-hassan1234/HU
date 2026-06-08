import { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, BookOpen, ClipboardCheck, GraduationCap, Star, TrendingUp, Users } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import { toast } from '../../utils/alerts';

export default function AdminDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard/admin')
      .then((res) => setData(res.data))
      .catch((error) => toast.fire({ icon: 'error', title: error.response?.data?.message || 'Dashboard failed' }));
  }, []);

  const totals = data?.totals || {};
  return (
    <>
      <PageHeader title="Admin Dashboard" subtitle="Real-time course evaluation overview for Hormuud University." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Students" value={totals.students} icon={Users} />
        <StatCard title="Total Lecturers" value={totals.lecturers} icon={GraduationCap} accent="gold" />
        <StatCard title="Total Courses" value={totals.courses} icon={BookOpen} />
        <StatCard title="Total Evaluations" value={totals.evaluations} icon={ClipboardCheck} accent="gold" />
        <StatCard title="Participation Rate" value={`${totals.participationRate || 0}%`} icon={TrendingUp} />
        <StatCard title="Average Satisfaction" value={totals.averageSatisfactionScore || 0} icon={Star} accent="gold" />
        <StatCard title="Top Lecturer" value={totals.topLecturer || 'N/A'} icon={BarChart3} />
        <StatCard title="Low Rated Courses" value={totals.lowRatedCourses || 0} icon={AlertTriangle} accent="gold" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="font-bold text-stone-900">Early Warnings</h2>
          <div className="mt-4 space-y-3">
            {(data?.earlyWarnings || []).length ? data.earlyWarnings.map((item) => (
              <div key={item.name} className="rounded-md border border-red-100 bg-red-50 p-3 text-sm">
                <span className="font-semibold text-red-700">{item.name}</span>
                <span className="text-red-600"> score {item.average}</span>
              </div>
            )) : <p className="text-sm text-stone-500">No low-score warnings.</p>}
          </div>
        </div>
        <div className="panel p-5">
          <h2 className="font-bold text-stone-900">Recent Activity</h2>
          <div className="mt-4 space-y-3">
            {(data?.activity || []).map((item) => (
              <div key={item._id} className="flex items-center justify-between rounded-md bg-stone-50 p-3 text-sm">
                <span className="font-medium text-stone-700">{item.action} {item.entity}</span>
                <span className="text-xs text-stone-500">{new Date(item.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
