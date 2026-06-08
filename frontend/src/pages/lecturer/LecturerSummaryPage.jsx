import { useEffect, useState } from 'react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import { CourseTable } from './LecturerDashboard';

export default function LecturerSummaryPage() {
  const [summary, setSummary] = useState(null);
  useEffect(() => {
    api.get('/lecturers/me/summary').then((res) => setSummary(res.data));
  }, []);
  return (
    <>
      <PageHeader title="My Evaluation Summary" subtitle="Aggregated scores from submitted student evaluations." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Submissions" value={summary?.totalSubmissions || 0} />
        <StatCard title="Lecturer Score" value={summary?.averageLecturerScore || 0} accent="gold" />
        <StatCard title="Course Score" value={summary?.averageCourseScore || 0} />
      </div>
      <CourseTable courses={summary?.courses || []} />
    </>
  );
}
