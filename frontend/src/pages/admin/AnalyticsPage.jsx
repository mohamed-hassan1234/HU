import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';

const colors = ['#006B3C', '#C9932A', '#2563eb', '#dc2626', '#7c3aed'];

export default function AnalyticsPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/evaluations/analytics').then((res) => setData(res.data));
  }, []);

  return (
    <>
      <PageHeader title="Analytics" subtitle="Chart-ready lecturer, course, department, faculty, semester, participation, and heatmap analytics." />
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel title="Lecturer Performance Trends">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.lecturerRanking || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" hide />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Bar dataKey="average" fill="#006B3C" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Course Satisfaction Levels">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.courseSatisfaction || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" hide />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Bar dataKey="average" fill="#C9932A" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Department Comparisons">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.departmentComparison || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Bar dataKey="average" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Participation Chart">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data?.participationChart || []} dataKey="value" nameKey="name" outerRadius={95} label>
                {(data?.participationChart || []).map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Semester Trends">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data?.semesterTrends || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Line type="monotone" dataKey="average" stroke="#006B3C" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Heatmap Analytics">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(data?.heatmap || []).slice(0, 18).map((item, index) => (
              <div key={`${item.course}-${index}`} className="rounded-md p-3 text-sm text-white" style={{ backgroundColor: item.score >= 4 ? '#006B3C' : item.score >= 3 ? '#C9932A' : '#dc2626' }}>
                <div className="font-bold">{item.course}</div>
                <div className="truncate text-white/85">{item.department}</div>
                <div>{item.score}/5</div>
              </div>
            ))}
          </div>
        </ChartPanel>
      </div>
    </>
  );
}

function ChartPanel({ title, children }) {
  return (
    <div className="panel p-5">
      <h2 className="mb-4 font-bold text-stone-900">{title}</h2>
      {children}
    </div>
  );
}
