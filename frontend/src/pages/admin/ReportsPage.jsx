import { useEffect, useState } from 'react';
import { Download, Filter } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';

const filters = ['faculty', 'department', 'courseCode', 'lecturerId', 'className', 'semester', 'academicYear'];

export default function ReportsPage() {
  const [query, setQuery] = useState({});
  const [report, setReport] = useState(null);

  const load = async () => {
    const { data } = await api.get('/evaluations/reports', { params: query });
    setReport(data);
  };

  useEffect(() => {
    load();
  }, []);

  const exportCsv = async () => {
    const response = await api.get('/evaluations/export-csv', { params: query, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'evaluation-report.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader title="Evaluation Reports" subtitle="Filter reports by faculty, department, course, lecturer, class, semester, and academic year." />
      <div className="panel mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {filters.map((key) => (
            <input key={key} className="input" placeholder={key} value={query[key] || ''} onChange={(e) => setQuery({ ...query, [key]: e.target.value })} />
          ))}
          <button className="btn-primary" onClick={load}><Filter size={16} />Apply Filters</button>
          <button className="btn-secondary" onClick={exportCsv}><Download size={16} />Export CSV</button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Average Lecturer Score" value={report?.averageLecturerScore || 0} />
        <StatCard title="Average Course Score" value={report?.averageCourseScore || 0} accent="gold" />
        <StatCard title="Participation Rate" value={`${report?.participationRate || 0}%`} />
        <StatCard title="Total Submissions" value={report?.totalSubmissions || 0} accent="gold" />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Ranking title="Lecturer Ranking" rows={report?.lecturerRanking || []} />
        <Ranking title="Course Satisfaction" rows={report?.courseSatisfaction || []} />
        <Ranking title="Department Comparison" rows={report?.departmentComparison || []} />
        <Ranking title="Faculty Comparison" rows={report?.facultyComparison || []} />
      </div>
    </>
  );
}

function Ranking({ title, rows }) {
  return (
    <div className="panel p-5">
      <h2 className="font-bold text-stone-900">{title}</h2>
      <div className="mt-4 space-y-2">
        {rows.length ? rows.map((row) => (
          <div key={row.name} className="flex items-center justify-between rounded-md bg-stone-50 p-3 text-sm">
            <span className="font-medium text-stone-700">{row.name}</span>
            <span className="font-bold text-huGreen">{row.average}</span>
          </div>
        )) : <p className="text-sm text-stone-500">No data yet.</p>}
      </div>
    </div>
  );
}
