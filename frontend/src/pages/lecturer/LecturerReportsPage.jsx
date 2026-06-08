import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';

export default function LecturerReportsPage() {
  const [report, setReport] = useState(null);

  useEffect(() => {
    api.get('/evaluations/reports').then((res) => setReport(res.data));
  }, []);

  const download = async () => {
    const response = await api.get('/evaluations/export-csv', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lecturer-report.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader title="Course Reports" subtitle="Course-level report summary for your assigned evaluations." actions={<button className="btn-primary" onClick={download}><Download size={16} />Download Report</button>} />
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
      <h2 className="font-bold">{title}</h2>
      <div className="mt-3 space-y-2">
        {rows.length ? rows.map((row) => (
          <div key={row.name} className="flex justify-between rounded-md bg-stone-50 p-3 text-sm">
            <span>{row.name}</span>
            <span className="font-bold text-huGreen">{row.average}</span>
          </div>
        )) : <p className="text-sm text-stone-500">No report data yet.</p>}
      </div>
    </div>
  );
}
