import { useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import api from '../../api/axios';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';

export default function EvaluationsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/evaluations');
    setRows(data.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const exportCsv = async () => {
    const response = await api.get('/evaluations/export-csv', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'evaluations.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Evaluations"
        subtitle="Review submitted course evaluations and sentiment categories."
        actions={
          <>
            <button className="btn-secondary" onClick={load}><RefreshCw size={16} />Refresh</button>
            <button className="btn-primary" onClick={exportCsv}><Download size={16} />Export CSV</button>
          </>
        }
      />
      <div className="panel overflow-x-auto">
        {loading ? <div className="p-8 text-center text-sm text-stone-500">Loading evaluations...</div> : rows.length === 0 ? <div className="p-4"><EmptyState /></div> : (
          <table className="min-w-full divide-y divide-stone-200 text-sm">
            <thead className="bg-stone-50">
              <tr>
                {['Student', 'Course', 'Lecturer', 'Class', 'Course Score', 'Lecturer Score', 'Recommendation', 'Sentiment', 'Submitted'].map((head) => (
                  <th key={head} className="whitespace-nowrap px-4 py-3 text-left font-semibold text-stone-600">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((row) => (
                <tr key={row._id}>
                  <td className="px-4 py-3">{row.anonymous ? 'Anonymous' : row.studentId}</td>
                  <td className="px-4 py-3">{row.courseCode} - {row.courseName}</td>
                  <td className="px-4 py-3">{row.lecturerName}</td>
                  <td className="px-4 py-3">{row.className}</td>
                  <td className="px-4 py-3">{row.courseOverallRating}</td>
                  <td className="px-4 py-3">{row.lecturerOverallRating}</td>
                  <td className="px-4 py-3">{row.recommendation}</td>
                  <td className="px-4 py-3 capitalize">{row.sentiment}</td>
                  <td className="px-4 py-3">{new Date(row.submittedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
