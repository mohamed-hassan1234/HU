import { useEffect, useState } from 'react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';

export default function LecturerReportsPage() {
  const [report, setReport] = useState(null);

  useEffect(() => {
    api.get('/evaluations/reports').then((res) => setReport(res.data));
  }, []);

  return (
    <>
      <PageHeader title="Course Reports" subtitle="Course-level report summary for your assigned evaluations." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Course Satisfaction" rows={report?.courseSatisfaction || []} />
        <Panel title="Department Comparison" rows={report?.departmentComparison || []} />
      </div>
    </>
  );
}

function Panel({ title, rows }) {
  return (
    <div className="panel p-5">
      <h2 className="font-semibold text-huText">{title}</h2>
      <div className="mt-3 space-y-2">
        {rows.length ? rows.map((row) => (
          <div key={row.name} className="flex justify-between rounded-md bg-slate-50 p-3 text-sm text-slate-600">
            <span>{row.name}</span>
            <span className="font-bold text-huGreen">{row.average}</span>
          </div>
        )) : <p className="text-sm text-slate-500">No report data yet.</p>}
      </div>
    </div>
  );
}
