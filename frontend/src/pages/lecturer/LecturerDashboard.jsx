import { useEffect, useState } from 'react';
import { BarChart3, BookOpen, ClipboardCheck, Star } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import { useAuth } from '../../context/AuthContext';

export default function LecturerDashboard() {
  const { profile } = useAuth();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get('/lecturers/me/summary').then((res) => setSummary(res.data));
  }, []);

  return (
    <>
      <PageHeader title="Lecturer Dashboard" subtitle={`Welcome, ${profile?.fullName || 'lecturer'}.`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Submissions" value={summary?.totalSubmissions || 0} icon={ClipboardCheck} />
        <StatCard title="Lecturer Score" value={summary?.averageLecturerScore || 0} icon={Star} accent="gold" />
        <StatCard title="Course Score" value={summary?.averageCourseScore || 0} icon={BarChart3} />
        <StatCard title="Courses" value={summary?.courses?.length || 0} icon={BookOpen} accent="gold" />
      </div>
      <CourseTable courses={summary?.courses || []} />
    </>
  );
}

export function CourseTable({ courses }) {
  return (
    <div className="panel mt-6 overflow-hidden">
      <div className="border-b border-stone-200 p-4 font-bold">Course Summary</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50">
            <tr>
              {['Code', 'Course', 'Submissions', 'Average'].map((head) => <th key={head} className="px-4 py-3 text-left font-semibold text-stone-600">{head}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {courses.map((course) => (
              <tr key={course.courseCode}>
                <td className="px-4 py-3">{course.courseCode}</td>
                <td className="px-4 py-3">{course.courseName}</td>
                <td className="px-4 py-3">{course.count}</td>
                <td className="px-4 py-3 font-bold text-huGreen">{course.average}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
