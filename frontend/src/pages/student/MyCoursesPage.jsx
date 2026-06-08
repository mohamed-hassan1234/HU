import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';

export default function MyCoursesPage() {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    api.get('/student/my-courses').then((res) => setCourses(res.data));
  }, []);

  return (
    <>
      <PageHeader title="My Courses" subtitle="Courses assigned to your class, semester, and academic year." />
      <div className="panel overflow-hidden">
        {courses.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200 text-sm">
              <thead className="bg-stone-50">
                <tr>
                  {['Course Code', 'Course Name', 'Lecturer', 'Semester', 'Status', 'Action'].map((head) => (
                    <th key={head} className="whitespace-nowrap px-4 py-3 text-left font-semibold text-stone-600">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {courses.map((course) => (
                  <tr key={course._id}>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-huGreen">{course.courseCode}</td>
                    <td className="whitespace-nowrap px-4 py-3">{course.courseName}</td>
                    <td className="whitespace-nowrap px-4 py-3">{course.lecturerName}</td>
                    <td className="whitespace-nowrap px-4 py-3">{course.semester}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-bold ${course.evaluated ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {course.studentStatus || (course.evaluated ? 'Completed' : 'Pending')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link className={course.evaluated ? 'btn-secondary pointer-events-none opacity-60' : 'btn-primary'} to={`/student/evaluate/${encodeURIComponent(course.courseCode)}`}>
                        Evaluate Course
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="p-4"><EmptyState title="No assigned courses found" /></div>}
      </div>
    </>
  );
}
