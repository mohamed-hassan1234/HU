import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../utils/alerts';

const commentsTemplate = { valuable: '', improve: '', missing: '', other: '' };

export default function EvaluationFormPage() {
  const { courseCode } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [courses, setCourses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [overall, setOverall] = useState({ courseOverallRating: 5, lecturerOverallRating: 5, recommendation: 'Yes', attendanceRate: '75-100%', anonymous: true });
  const [comments, setComments] = useState(commentsTemplate);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/student/my-courses'), api.get('/questions', { params: { activeOnly: true } })]).then(([coursesRes, questionsRes]) => {
      setCourses(coursesRes.data);
      const active = (questionsRes.data.data || []).filter((q) => ['Teaching & Instruction Quality', 'Course Content & Curriculum', 'Assessment & Evaluation', 'Learning Environment & Resources'].includes(q.category));
      setQuestions(active);
      setResponses(active.reduce((acc, question) => ({ ...acc, [question.questionId]: 5 }), {}));
    });
  }, []);

  const course = useMemo(() => courses.find((item) => item.courseCode === decodeURIComponent(courseCode || '')), [courses, courseCode]);
  if (course?.evaluated) return <Navigate to="/student/courses" replace />;

  const grouped = questions.reduce((acc, question) => {
    acc[question.category] ||= [];
    acc[question.category].push(question);
    return acc;
  }, {});

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/student/submit-evaluation', {
        assignmentId: course.assignmentId,
        courseCode: course.courseCode,
        responses: questions.map((question) => ({
          questionId: question.questionId,
          questionText: question.questionText,
          category: question.category,
          answer: responses[question.questionId],
          rating: Number(responses[question.questionId])
        })),
        ...overall,
        comments
      });
      toast.fire({ icon: 'success', title: 'Evaluation submitted' });
      navigate('/student/evaluations');
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Submission failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Course Evaluation" subtitle={course ? `${course.courseCode} - ${course.courseName}` : 'Loading course...'} />
      <form onSubmit={submit} className="space-y-5">
        <section className="panel p-5">
          <h2 className="font-bold text-stone-900">Section A: Course Information</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Faculty / College" value={profile?.faculty} />
            <Info label="Program / Degree" value={profile?.department} />
            <Info label="Course Code & Name" value={course ? `${course.courseCode} - ${course.courseName}` : ''} />
            <Info label="Semester" value={profile?.semester} />
            <Info label="Mode of Delivery" value="On-campus" />
            <Info label="Assigned Lecturer" value={course?.lecturerName} />
          </div>
        </section>

        {Object.entries(grouped).map(([category, items]) => (
          <section key={category} className="panel p-5">
            <h2 className="font-bold text-stone-900">{category}</h2>
            <div className="mt-4 space-y-4">
              {items.map((question) => (
                <div key={question.questionId} className="grid gap-3 rounded-md bg-stone-50 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <p className="text-sm font-medium text-stone-800">{question.questionText}</p>
                  <Rating value={responses[question.questionId] || 5} onChange={(value) => setResponses({ ...responses, [question.questionId]: value })} />
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="panel p-5">
          <h2 className="font-bold text-stone-900">Section F: Overall Rating</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-sm font-semibold text-stone-700">Overall course rating</span>
              <Rating value={overall.courseOverallRating} onChange={(value) => setOverall({ ...overall, courseOverallRating: value })} />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-stone-700">Overall lecturer rating</span>
              <Rating value={overall.lecturerOverallRating} onChange={(value) => setOverall({ ...overall, lecturerOverallRating: value })} />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-stone-700">Would you recommend this course?</span>
              <select className="input" value={overall.recommendation} onChange={(e) => setOverall({ ...overall, recommendation: e.target.value })}>
                {['Yes', 'Maybe', 'No'].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-stone-700">Attendance rate</span>
              <select className="input" value={overall.attendanceRate} onChange={(e) => setOverall({ ...overall, attendanceRate: e.target.value })}>
                {['75-100%', '50-74%', 'Less than 50%'].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="font-bold text-stone-900">Section G: Comments</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Comment label="What did you find most valuable?" value={comments.valuable} onChange={(value) => setComments({ ...comments, valuable: value })} />
            <Comment label="What should be improved?" value={comments.improve} onChange={(value) => setComments({ ...comments, improve: value })} />
            <Comment label="What topics or skills do you wish were covered?" value={comments.missing} onChange={(value) => setComments({ ...comments, missing: value })} />
            <Comment label="Any other comments?" value={comments.other} onChange={(value) => setComments({ ...comments, other: value })} />
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={overall.anonymous} onChange={(e) => setOverall({ ...overall, anonymous: e.target.checked })} />
            Submit anonymously
          </label>
        </section>
        <div className="flex justify-end">
          <button className="btn-primary" disabled={saving || !course}><Send size={16} />Submit Evaluation</button>
        </div>
      </form>
    </>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-md bg-stone-50 p-3">
      <p className="text-xs font-semibold uppercase text-stone-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-stone-800">{value || 'N/A'}</p>
    </div>
  );
}

function Rating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((number) => (
        <button key={number} type="button" onClick={() => onChange(number)} className={`h-9 w-9 rounded-md text-sm font-bold ${Number(value) >= number ? 'bg-huGold text-white' : 'bg-white text-stone-500 ring-1 ring-stone-200'}`}>
          {number}
        </button>
      ))}
    </div>
  );
}

function Comment({ label, value, onChange }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-semibold text-stone-700">{label}</span>
      <textarea className="input min-h-28" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
