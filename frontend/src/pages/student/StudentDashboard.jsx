import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Clock, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import { useAuth } from '../../context/AuthContext';

export default function StudentDashboard() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    api.get('/student/my-courses').then((res) => setCourses(res.data));
  }, []);

  const evaluated = courses.filter((course) => course.evaluated).length;
  return (
    <>
      <PageHeader title="Student Dashboard" subtitle={`Welcome, ${profile?.fullName || 'student'}.`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Assigned Courses" value={courses.length} icon={BookOpen} />
        <StatCard title="Evaluated Courses" value={evaluated} icon={CheckCircle2} accent="gold" />
        <StatCard title="Pending Courses" value={Math.max(courses.length - evaluated, 0)} icon={Clock} />
        <StatCard title="Class" value={profile?.className || 'N/A'} icon={UserRound} accent="gold" />
      </div>
      <div className="panel mt-6 overflow-hidden">
        <div className="border-b border-stone-200 p-4 font-bold">My Courses</div>
        <div className="divide-y divide-stone-100">
          {courses.map((course) => (
            <div key={course._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-stone-900">{course.courseCode} - {course.courseName}</p>
                <p className="text-sm text-stone-500">{course.lecturerName}</p>
              </div>
              <Link className={course.evaluated ? 'btn-secondary pointer-events-none opacity-60' : 'btn-primary'} to={`/student/evaluate/${encodeURIComponent(course.courseCode)}`}>
                {course.evaluated ? 'Completed' : 'Evaluate Course'}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
