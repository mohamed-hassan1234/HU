import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Filter } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import SearchableSelect from '../../components/SearchableSelect';
import StatCard from '../../components/StatCard';

const colors = ['#006B3C', '#C9932A', '#2563eb', '#dc2626', '#7c3aed'];

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [query, setQuery] = useState({});
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);

  const load = () => {
    const params = Object.fromEntries(Object.entries(query).filter(([, value]) => value));
    api.get('/evaluations/analytics', { params }).then((res) => setData(res.data));
  };

  useEffect(() => {
    Promise.all([api.get('/faculties'), api.get('/departments'), api.get('/classes')]).then(([facultyRes, departmentRes, classRes]) => {
      setFaculties(facultyRes.data.data || []);
      setDepartments(departmentRes.data.data || []);
      setClasses(classRes.data.data || []);
    });
    load();
  }, []);

  const filteredDepartments = departments.filter((item) => !query.facultyId || String(item.faculty) === String(query.facultyId));
  const filteredClasses = classes.filter((item) => {
    if (query.departmentId) return String(item.department) === String(query.departmentId);
    if (query.facultyId) return String(item.faculty) === String(query.facultyId);
    return true;
  });

  return (
    <>
      <PageHeader title="Analytics" subtitle="Chart-ready lecturer, course, department, faculty, semester, participation, and heatmap analytics." />
      <div className="panel mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SearchableSelect value={query.facultyId || ''} onChange={(value) => setQuery({ ...query, facultyId: value, departmentId: '', classId: '' })} options={faculties.map((item) => ({ value: item._id, label: item.name }))} placeholder="All Faculties" label="Filter by faculty" />
          <SearchableSelect value={query.departmentId || ''} onChange={(value) => setQuery({ ...query, departmentId: value, classId: '' })} options={filteredDepartments.map((item) => ({ value: item._id, label: item.name }))} placeholder="All Departments" label="Filter by department" />
          <SearchableSelect value={query.classId || ''} onChange={(value) => setQuery({ ...query, classId: value })} options={filteredClasses.map((item) => ({ value: item._id, label: item.className }))} placeholder="All Classes" label="Filter by class" />
          {['courseCode', 'lecturerId', 'semester', 'academicYear'].map((key) => (
            <input key={key} className="input" placeholder={key} value={query[key] || ''} onChange={(e) => setQuery({ ...query, [key]: e.target.value })} />
          ))}
          <button className="btn-primary" onClick={load}><Filter size={16} />Apply Filters</button>
        </div>
      </div>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard title="Best Department" value={data?.bestDepartment?.name || 'N/A'} />
        <StatCard title="Worst Department" value={data?.worstDepartment?.name || 'N/A'} accent="gold" />
        <StatCard title="Best Faculty" value={data?.bestFaculty?.name || 'N/A'} />
        <StatCard title="Worst Faculty" value={data?.worstFaculty?.name || 'N/A'} accent="gold" />
        <StatCard title="Best Class" value={data?.highestRatedClass?.name || 'N/A'} />
        <StatCard title="Worst Class" value={data?.lowestRatedClass?.name || 'N/A'} accent="gold" />
      </div>
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
        <RankingPanel title="Faculty Rankings" rows={data?.facultyRankings || []} />
        <RankingPanel title="Class Rankings" rows={data?.classRankings || []} />
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

function RankingPanel({ title, rows }) {
  return (
    <div className="panel p-5">
      <h2 className="mb-4 font-bold text-stone-900">{title}</h2>
      <div className="space-y-2">
        {rows.length ? rows.slice(0, 10).map((row) => (
          <div key={row.id || row.name} className="flex items-center justify-between rounded-md bg-slate-50 p-3 text-sm">
            <span className="font-semibold text-slate-700">#{row.rank} {row.name}</span>
            <span className="font-black text-huGreen">{row.average}/5</span>
          </div>
        )) : <p className="text-sm text-slate-500">No ranking data yet.</p>}
      </div>
    </div>
  );
}
