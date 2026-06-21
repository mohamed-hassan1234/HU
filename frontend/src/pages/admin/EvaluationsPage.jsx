import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Eye, RefreshCw, Search } from 'lucide-react';
import api from '../../api/axios';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';

export default function EvaluationsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState({});
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/evaluations', { params: query });
    setRows(data.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const columns = useMemo(() => [
    { header: 'Student', accessorKey: 'studentName' },
    { header: 'Student ID', accessorKey: 'studentId' },
    { header: 'Course', accessorFn: (row) => `${row.courseCode} - ${row.courseName}` },
    { header: 'Teacher', accessorKey: 'lecturerName' },
    { header: 'Class', accessorKey: 'className' },
    { header: 'Faculty', accessorKey: 'faculty' },
    { header: 'Course Score', accessorKey: 'courseOverallRating' },
    { header: 'Teacher Score', accessorKey: 'lecturerOverallRating' },
    { header: 'Submitted', accessorFn: (row) => new Date(row.submittedAt).toLocaleDateString() },
    {
      header: '',
      id: 'actions',
      cell: ({ row }) => (
        <button className="btn-secondary px-3 py-1.5" onClick={() => setSelected(row.original)}>
          <Eye size={15} /> View
        </button>
      )
    }
  ], []);

  const table = useReactTable({
    data: rows,
    columns,
    defaultColumn: {
      cell: ({ getValue }) => getValue()
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } }
  });

  const exportCsv = async () => {
    const response = await api.get('/evaluations/export-csv', { params: query, responseType: 'blob' });
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
        title="Evaluation Management"
        subtitle="View every submitted evaluation, question answer, comment, class, faculty, and submission date."
        actions={
          <>
            <button className="btn-secondary" onClick={load}><RefreshCw size={16} />Refresh</button>
            <button className="btn-primary" onClick={exportCsv}><Download size={16} />Export CSV</button>
          </>
        }
      />

      <div className="panel mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
          {['semester', 'faculty', 'department', 'className', 'lecturerId', 'courseCode', 'academicYear'].map((key) => (
            <input key={key} className="input" placeholder={key} value={query[key] || ''} onChange={(e) => setQuery({ ...query, [key]: e.target.value })} />
          ))}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input className="input" type="date" value={query.dateFrom || ''} onChange={(e) => setQuery({ ...query, dateFrom: e.target.value })} />
          <input className="input" type="date" value={query.dateTo || ''} onChange={(e) => setQuery({ ...query, dateTo: e.target.value })} />
          <button className="btn-primary" onClick={load}><Search size={16} />Search</button>
        </div>
      </div>

      <div className="panel overflow-hidden">
        {loading ? <div className="p-8 text-center text-sm text-slate-500">Loading evaluations...</div> : rows.length === 0 ? <div className="p-4"><EmptyState /></div> : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white/80">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-huGreen/5">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-sm text-slate-600">
              <span>Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span>
              <div className="flex gap-2">
                <button className="btn-secondary px-3" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><ChevronLeft size={16} /></button>
                <button className="btn-secondary px-3" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><ChevronRight size={16} /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {selected ? <EvaluationDrawer evaluation={selected} onClose={() => setSelected(null)} /> : null}
    </>
  );
}

function EvaluationDrawer({ evaluation, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-sm">
      <button className="absolute inset-0" onClick={onClose} aria-label="Close details" />
      <aside className="relative h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-huText">{evaluation.courseCode} - {evaluation.courseName}</h2>
            <p className="mt-1 text-sm text-slate-500">{evaluation.lecturerName} / {evaluation.className} / {evaluation.faculty}</p>
          </div>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Info label="Student" value={evaluation.studentName || evaluation.studentId} />
          <Info label="Student ID" value={evaluation.studentId} />
          <Info label="Course Score" value={`${evaluation.courseOverallRating || 0}/5`} />
          <Info label="Teacher Score" value={`${evaluation.lecturerOverallRating || 0}/5`} />
          <Info label="Recommendation" value={evaluation.recommendation} />
          <Info label="Submitted" value={new Date(evaluation.submittedAt).toLocaleString()} />
        </div>

        <section className="mt-6">
          <h3 className="font-bold text-huText">Question Answers</h3>
          <div className="mt-3 space-y-2">
            {(evaluation.responses || []).map((answer) => (
              <div key={answer.questionId} className="rounded-xl bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-800">{answer.questionText}</p>
                <p className="mt-1 text-sm text-huGreen">{answer.rating || answer.answer}/5</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="font-bold text-huText">Comments</h3>
          <div className="mt-3 space-y-2">
            {Object.entries(evaluation.comments || {}).filter(([, value]) => value).map(([key, value]) => (
              <div key={key} className="rounded-xl bg-slate-50 p-3 text-sm">
                <p className="font-semibold capitalize text-slate-700">{key}</p>
                <p className="mt-1 text-slate-600">{value}</p>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-800">{value || 'N/A'}</p>
    </div>
  );
}
