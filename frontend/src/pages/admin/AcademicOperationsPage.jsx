import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';

const emptyCampaign = { name: '', academicYear: '', term: '', startsAt: '', endsAt: '', targetType: 'all', minimumResponses: 5 };

export default function AcademicOperationsPage() {
  const [years, setYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [classes, setClasses] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(emptyCampaign);
  const [preview, setPreview] = useState(null);
  const [outcomes, setOutcomes] = useState({});
  const [message, setMessage] = useState('');

  const load = async () => {
    const [yearRes, termRes, campaignRes, classRes, facultyRes, departmentRes] = await Promise.all([
      api.get('/academic-years'), api.get('/academic-terms'), api.get('/campaigns'), api.get('/classes', { params: { limit: 500 } }), api.get('/faculties'), api.get('/departments')
    ]);
    setYears(yearRes.data.data || yearRes.data || []);
    setTerms(termRes.data.data || termRes.data || []);
    setCampaigns(campaignRes.data || []);
    setClasses(classRes.data.data || classRes.data || []);
    setFaculties(facultyRes.data.data || facultyRes.data || []);
    setDepartments(departmentRes.data.data || departmentRes.data || []);
  };
  useEffect(() => { load().catch((error) => setMessage(error.response?.data?.message || error.message)); }, []);
  const availableTerms = useMemo(() => terms.filter((term) => String(term.academicYear) === form.academicYear), [terms, form.academicYear]);

  const createCampaign = async (event) => {
    event.preventDefault(); setMessage('');
    try { await api.post('/campaigns', { ...form, targetIds: form.targetType === 'all' ? [] : [form.targetId], startsAt: new Date(form.startsAt), endsAt: new Date(form.endsAt) }); setForm(emptyCampaign); await load(); }
    catch (error) { setMessage(error.response?.data?.message || error.message); }
  };
  const transition = async (id, status) => {
    try { await api.patch(`/campaigns/${id}/status`, { status }); await load(); }
    catch (error) { setMessage(error.response?.data?.message || error.message); }
  };
  const inspectPromotion = async (classId) => {
    try { const { data } = await api.get(`/promotions/${classId}/preview`); setPreview(data); setOutcomes({}); setMessage(''); }
    catch (error) { setMessage(error.response?.data?.message || error.message); }
  };
  const promoteAll = async () => {
    if (!preview || !window.confirm(`Promote ${preview.students.length} students in ${preview.class.className}?`)) return;
    const exceptions = Object.entries(outcomes).map(([studentId, value]) => ({ studentId, ...value })).filter((item) => item.outcome);
    try { await api.post(`/promotions/${preview.class._id}/execute`, { outcomes: exceptions }); setPreview(null); await load(); setMessage('Promotion completed.'); }
    catch (error) { setMessage(error.response?.data?.message || error.message); }
  };

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-900">Academic Operations</h1><p className="text-sm text-slate-500">Schedule evaluation campaigns and advance classes after each term.</p></div>
    {message && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{message}</div>}
    <form onSubmit={createCampaign} className="card grid gap-4 p-5 md:grid-cols-3">
      <input className="input" placeholder="Campaign name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <select className="input" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value, term: '' })} required><option value="">Academic year</option>{years.map((x) => <option key={x._id} value={x._id}>{x.name}</option>)}</select>
      <select className="input" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} required><option value="">Term</option>{availableTerms.map((x) => <option key={x._id} value={x._id}>{x.name}</option>)}</select>
      <input className="input" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} required />
      <input className="input" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} required />
      <select className="input" value={form.targetType} onChange={(e) => setForm({ ...form, targetType: e.target.value, targetId: '' })}><option value="all">All university</option><option value="faculty">Faculty</option><option value="department">Department</option><option value="class">Class</option></select>
      {form.targetType !== 'all' && <select className="input" value={form.targetId || ''} onChange={(e) => setForm({ ...form, targetId: e.target.value })} required><option value="">Select target</option>{(form.targetType === 'faculty' ? faculties : form.targetType === 'department' ? departments : classes).map((x) => <option key={x._id} value={x._id}>{x.name || x.className}</option>)}</select>}
      <button className="btn-primary" type="submit">Create campaign</button>
    </form>
    <div className="card overflow-x-auto p-5"><h2 className="mb-3 font-bold">Evaluation campaigns</h2><table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th>Name</th><th>Period</th><th>Window</th><th>Status</th><th>Action</th></tr></thead><tbody>{campaigns.map((x) => <tr key={x._id} className="border-t"><td className="py-3">{x.name}</td><td>{x.academicYearName} / Term {x.termNumber}</td><td>{new Date(x.startsAt).toLocaleString()} – {new Date(x.endsAt).toLocaleString()}</td><td>{x.status}</td><td className="space-x-2">{x.status === 'scheduled' && <button className="btn-secondary" onClick={() => transition(x._id, 'open')}>Open</button>}{x.status === 'open' && <button className="btn-secondary" onClick={() => transition(x._id, 'closed')}>Close</button>}{x.status === 'closed' && <button className="btn-primary" onClick={() => transition(x._id, 'published')}>Publish</button>}</td></tr>)}</tbody></table></div>
    <div className="card p-5"><h2 className="mb-3 font-bold">Class promotion</h2><div className="grid gap-2 md:grid-cols-3">{classes.filter((x) => x.status === 'active').map((x) => <button key={x._id} className="rounded-xl border p-3 text-left hover:border-huGreen" onClick={() => inspectPromotion(x._id)}><b>{x.classCode}</b> — {x.className}<br/><span className="text-xs text-slate-500">Semester {x.currentSemester}</span></button>)}</div>{preview && <div className="mt-5 rounded-xl bg-slate-50 p-4"><p><b>{preview.class.className}</b>: {preview.students.length} active students → semester {preview.nextSemester}</p><div className="mt-3 max-h-72 overflow-auto">{preview.students.map((student) => { const value = outcomes[student.studentId] || {}; return <div key={student.studentId} className="grid gap-2 border-t py-2 md:grid-cols-4"><span>{student.studentId} — {student.fullName}</span><select className="input" value={value.outcome || ''} onChange={(e) => setOutcomes({ ...outcomes, [student.studentId]: { ...value, outcome: e.target.value } })}><option value="">Default</option><option value="repeated">Repeat</option><option value="transferred">Transfer</option><option value="suspended">Suspend</option><option value="withdrawn">Withdraw</option><option value="graduated">Graduate</option></select>{['repeated', 'transferred'].includes(value.outcome) && <select className="input" value={value.destinationClassId || ''} onChange={(e) => setOutcomes({ ...outcomes, [student.studentId]: { ...value, destinationClassId: e.target.value } })}><option value="">Destination class</option>{classes.filter((x) => x.status === 'active').map((x) => <option key={x._id} value={x._id}>{x.classCode} — Sem {x.currentSemester}</option>)}</select>}<input className="input" placeholder="Reason" value={value.reason || ''} onChange={(e) => setOutcomes({ ...outcomes, [student.studentId]: { ...value, reason: e.target.value } })}/></div>; })}</div><button className="btn-primary mt-3" onClick={promoteAll}>{preview.graduating ? 'Complete graduation' : 'Complete promotion'}</button></div>}</div>
  </div>;
}
