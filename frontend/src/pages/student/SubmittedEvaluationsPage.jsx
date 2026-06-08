import { useEffect, useState } from 'react';
import api from '../../api/axios';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';

export default function SubmittedEvaluationsPage() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get('/student/evaluated-courses').then((res) => setRows(res.data.data || []));
  }, []);

  return (
    <>
      <PageHeader title="Submitted Evaluations" subtitle="Courses you have already evaluated." />
      <div className="panel overflow-hidden">
        {rows.length ? rows.map((row) => (
          <div key={row._id} className="flex flex-col gap-2 border-b border-stone-100 p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-stone-900">{row.courseCode} - {row.courseName}</p>
              <p className="text-sm text-stone-500">{row.lecturerName}</p>
            </div>
            <div className="text-sm font-semibold text-huGreen">{row.courseOverallRating}/5 course - {row.lecturerOverallRating}/5 lecturer</div>
          </div>
        )) : <div className="p-4"><EmptyState /></div>}
      </div>
    </>
  );
}
