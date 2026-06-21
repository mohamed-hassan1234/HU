import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Award, BarChart3, BookOpen, ClipboardCheck, Eye, Medal, MessageSquare, Send, Star, Trophy, Users } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../utils/alerts';

export default function LecturerDashboard() {
  const { profile } = useAuth();
  const [summary, setSummary] = useState(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [comment, setComment] = useState('');
  const [category, setCategory] = useState('general');

  const load = () => {
    api.get('/lecturers/me/summary').then((res) => {
      setSummary(res.data);
      setSelectedClass((current) => current || res.data.assignedClasses?.[0] || '');
    });
  };

  useEffect(() => {
    load();
  }, []);

  const activeClass = useMemo(
    () => (summary?.classSummaries || []).find((item) => item.className === selectedClass),
    [summary, selectedClass]
  );

  const submitComment = async () => {
    if (!selectedClass || !comment.trim()) return;
    try {
      await api.post('/lecturers/me/comments', { className: selectedClass, comment, category });
      setComment('');
      toast.fire({ icon: 'success', title: 'Class feedback saved' });
      load();
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Comment failed' });
    }
  };

  return (
    <>
      <PageHeader title="Teacher Dashboard" subtitle={`Welcome, ${profile?.fullName || 'lecturer'}. Your dashboard only uses your assigned course and evaluation data.`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total Courses" value={summary?.totalCourses || 0} icon={BookOpen} />
        <StatCard title="Total Evaluations" value={summary?.totalEvaluations || 0} icon={ClipboardCheck} accent="blue" />
        <StatCard title="Average Score" value={`${summary?.averageLecturerScore || 0}/5`} icon={Star} />
        <StatCard title="University Ranking" value={summary?.universityRanking ? `#${summary.universityRanking.rank} of ${summary.universityRanking.totalLecturers}` : 'N/A'} icon={Trophy} accent="gold" />
        <StatCard title="Faculty Ranking" value={summary?.facultyRanking ? `#${summary.facultyRanking.rank} in ${summary.facultyRanking.faculty}` : 'N/A'} icon={Medal} accent="blue" />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <CoursePerformance courses={summary?.courses || []} />
        <Insights insights={summary?.insights || []} />
      </div>

      <TeacherEvaluations evaluations={summary?.evaluations || []} />

      <div className="mt-6 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <ClassAnalysis
          classes={summary?.assignedClasses || []}
          activeClass={activeClass}
          selectedClass={selectedClass}
          setSelectedClass={setSelectedClass}
        />
        <TopStudents students={summary?.topStudents || []} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="panel p-5">
          <h2 className="flex items-center gap-2 font-bold text-huText"><MessageSquare size={18} /> Class Comment System</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <select className="input" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
              {(summary?.assignedClasses || []).map((item) => <option key={item}>{item}</option>)}
            </select>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {['general', 'attendance', 'participation', 'coverage', 'assignments', 'practical'].map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <textarea
            className="input mt-3 min-h-28"
            placeholder="Attendance is very good. Students participate actively. Course syllabus completed successfully."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button className="btn-primary mt-3" onClick={submitComment}><Send size={16} />Save Feedback</button>
        </div>
        <div className="panel p-5">
          <h2 className="font-bold text-huText">Saved Class Comments</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(summary?.comments || []).slice(0, 6).map((item) => (
              <div key={item._id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-huGreen">{item.className}</span>
                  <span className="rounded-full bg-huBlue/10 px-2 py-1 text-xs font-semibold text-huBlue">{item.category}</span>
                </div>
                <p className="mt-2 text-slate-600">{item.comment}</p>
              </div>
            ))}
            {!(summary?.comments || []).length ? <p className="text-sm text-slate-500">No class comments yet.</p> : null}
          </div>
        </div>
      </div>
    </>
  );
}

function CoursePerformance({ courses }) {
  return (
    <div className="panel p-5">
      <h2 className="font-bold text-huText">Course Performance</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={courses}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="courseCode" />
            <YAxis domain={[0, 5]} />
            <Tooltip />
            <Bar dataKey="average" fill="#008751" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="space-y-3">
          {courses.map((course) => (
            <div key={course.courseCode} className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-800">{course.courseName}</p>
                  <p className="text-xs text-slate-500">{course.count} evaluations</p>
                </div>
                <span className="font-black text-huGreen">{course.average}/5</span>
              </div>
              {(course.trend || []).length > 1 ? (
                <div className="mt-3 h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={course.trend}>
                      <Line type="monotone" dataKey="score" stroke="#1E73BE" strokeWidth={2} dot={false} />
                      <Tooltip />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="mt-3 text-xs text-slate-500">A performance trend appears after two or more evaluations.</p>}
              <CommentList title="Top comments" rows={course.topComments} />
              <CommentList title="Negative comments" rows={course.negativeComments} />
            </div>
          ))}
          {!courses.length ? <p className="text-sm text-slate-500">No course evaluation data yet.</p> : null}
        </div>
      </div>
    </div>
  );
}

function TeacherEvaluations({ evaluations }) {
  return (
    <section className="panel mt-6 overflow-hidden">
      <div className="border-b border-slate-100 p-5">
        <h2 className="flex items-center gap-2 font-bold text-huText"><ClipboardCheck size={18} /> My Submitted Evaluations</h2>
        <p className="mt-1 text-sm text-slate-500">Only evaluations for your assigned courses are shown. Anonymous student identities remain hidden.</p>
      </div>
      {evaluations.length ? (
        <div className="divide-y divide-slate-100">
          {evaluations.map((evaluation) => (
            <details key={evaluation._id} className="group p-5">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-800">{evaluation.courseCode} - {evaluation.courseName}</p>
                  <p className="mt-1 text-xs text-slate-500">{evaluation.className} &bull; {evaluation.studentName} &bull; {new Date(evaluation.submittedAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span>Course <b className="text-huBlue">{evaluation.courseOverallRating}/5</b></span>
                  <span>Teacher <b className="text-huGreen">{evaluation.lecturerOverallRating}/5</b></span>
                  <Eye size={17} className="text-slate-400" />
                </div>
              </summary>
              <div className="mt-5 grid gap-5 border-t border-slate-100 pt-5 lg:grid-cols-2">
                <div>
                  <h3 className="text-sm font-bold text-huText">Question Answers</h3>
                  <div className="mt-3 space-y-2">
                    {(evaluation.responses || []).map((answer, index) => (
                      <div key={answer.questionId || index} className="rounded-lg bg-slate-50 p-3 text-sm">
                        <p className="font-semibold text-slate-700">{answer.questionText}</p>
                        <p className="mt-1 font-bold text-huGreen">{answer.rating || answer.answer}/5</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-huText">Comments and Details</h3>
                  <div className="mt-3 space-y-2 text-sm">
                    <p><b>Recommendation:</b> {evaluation.recommendation}</p>
                    <p><b>Attendance:</b> {evaluation.attendanceRate}</p>
                    {Object.entries(evaluation.comments || {}).filter(([, value]) => value).map(([key, value]) => (
                      <div key={key} className="rounded-lg bg-slate-50 p-3">
                        <p className="font-semibold capitalize text-slate-700">{key}</p>
                        <p className="mt-1 text-slate-600">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </details>
          ))}
        </div>
      ) : <p className="p-5 text-sm text-slate-500">No student has submitted an evaluation for your assigned courses yet.</p>}
    </section>
  );
}

export function CourseTable({ courses }) {
  return (
    <div className="panel mt-6 overflow-hidden">
      <div className="border-b border-slate-200 p-4 font-bold text-huText">Course Summary</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {['Code', 'Course', 'Evaluations', 'Average'].map((head) => <th key={head} className="px-4 py-3 text-left font-semibold text-slate-600">{head}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {courses.map((course) => (
              <tr key={course.courseCode}>
                <td className="px-4 py-3">{course.courseCode}</td>
                <td className="px-4 py-3">{course.courseName}</td>
                <td className="px-4 py-3">{course.count}</td>
                <td className="px-4 py-3 font-bold text-huGreen">{course.average}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CommentList({ title, rows = [] }) {
  if (!rows.length) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-bold uppercase text-slate-500">{title}</p>
      {rows.slice(0, 2).map((item, index) => <p key={index} className="mt-1 text-xs text-slate-600">{item.text}</p>)}
    </div>
  );
}

function Insights({ insights }) {
  return (
    <div className="panel p-5">
      <h2 className="flex items-center gap-2 font-bold text-huText"><BarChart3 size={18} /> Teacher Insights</h2>
      <div className="mt-4 space-y-3">
        {insights.map((item, index) => (
          <div key={index} className="rounded-xl border border-huGreen/10 bg-huGreen/5 p-3 text-sm text-slate-700">{item}</div>
        ))}
      </div>
    </div>
  );
}

function ClassAnalysis({ classes, activeClass, selectedClass, setSelectedClass }) {
  return (
    <div className="panel p-5">
      <h2 className="flex items-center gap-2 font-bold text-huText"><Users size={18} /> Class Analysis</h2>
      <select className="input mt-4" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
        {classes.map((item) => <option key={item}>{item}</option>)}
      </select>
      {activeClass ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Metric label="Attendance Quality" value={activeClass.attendanceQuality} />
          <Metric label="Course Coverage" value={`${activeClass.courseCoverage}%`} />
          <Metric label="Student Satisfaction" value={`${activeClass.studentSatisfaction}/5`} />
          <Metric label="Engagement Score" value={`${activeClass.engagementScore}%`} />
        </div>
      ) : <p className="mt-4 text-sm text-slate-500">Select an assigned class to see analysis.</p>}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-huText">{value}</p>
    </div>
  );
}

function TopStudents({ students }) {
  const styles = [
    'border-huGold/40 bg-huGold/10 text-huGold',
    'border-slate-300 bg-slate-100 text-slate-600',
    'border-amber-700/20 bg-amber-700/10 text-amber-700'
  ];
  return (
    <div className="panel p-5">
      <h2 className="flex items-center gap-2 font-bold text-huText"><Award size={18} /> Top 3 Students</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {students.map((student, index) => (
          <div key={student.studentId} className={`rounded-2xl border p-4 ${styles[index] || styles[1]}`}>
            <p className="text-sm font-black uppercase">{['Gold', 'Silver', 'Bronze'][index]}</p>
            <p className="mt-3 text-lg font-black text-huText">{student.name}</p>
            <p className="text-sm text-slate-500">{student.studentId}</p>
            <p className="mt-3 text-sm font-semibold text-slate-700">Average Score: {student.averageScore}/5</p>
            <p className="text-sm font-semibold text-slate-700">Attendance: {student.attendance}%</p>
          </div>
        ))}
        {!students.length ? <p className="text-sm text-slate-500">Top students appear after class evaluations are submitted.</p> : null}
      </div>
    </div>
  );
}
