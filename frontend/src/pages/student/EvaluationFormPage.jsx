import { AnimatePresence, motion } from 'framer-motion';
import { Award, ChevronLeft, ChevronRight, PartyPopper, Send, Sparkles, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../utils/alerts';

const commentsTemplate = { valuable: '', improve: '', missing: '', other: '' };
const allowedCategories = [
  'Teaching & Instruction Quality',
  'Course Content & Curriculum',
  'Assessment & Evaluation',
  'Learning Environment & Resources'
];

export default function EvaluationFormPage() {
  const { courseCode } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [courses, setCourses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [step, setStep] = useState(1);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [overall, setOverall] = useState({
    courseOverallRating: 5,
    lecturerOverallRating: 5,
    recommendation: 'Yes',
    attendanceRate: '75-100%',
    anonymous: true
  });
  const [comments, setComments] = useState(commentsTemplate);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/student/my-courses'), api.get('/questions', { params: { activeOnly: true } })])
      .then(([coursesRes, questionsRes]) => {
        const courseRows = coursesRes.data || [];
        const active = (questionsRes.data.data || [])
          .filter((q) => allowedCategories.includes(q.category))
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        setCourses(courseRows);
        setQuestions(active);
        setResponses({});
        const current = courseRows.find((item) => item.courseCode === decodeURIComponent(courseCode || '')) || courseRows.find((item) => !item.evaluated);
        if (current) setSelectedAssignmentId(current.assignmentId);
      })
      .catch((error) => toast.fire({ icon: 'error', title: error.response?.data?.message || 'Unable to load evaluation' }));
  }, [courseCode]);

  const selectedCourse = useMemo(
    () => courses.find((item) => item.assignmentId === selectedAssignmentId),
    [courses, selectedAssignmentId]
  );

  if (selectedCourse?.evaluated) return <Navigate to="/student/courses" replace />;

  const currentQuestion = questions[questionIndex];
  const progress = questions.length ? Math.round(((questionIndex + 1) / questions.length) * 100) : 0;
  const answeredRatings = questions.map((question) => Number(responses[question.questionId] || 0)).filter(Boolean);
  const answeredAverage = answeredRatings.length
    ? Number((answeredRatings.reduce((sum, value) => sum + value, 0) / answeredRatings.length).toFixed(1))
    : 0;

  const submit = async () => {
    if (!selectedCourse) return;
    setSaving(true);
    try {
      await api.post('/student/submit-evaluation', {
        assignmentId: selectedCourse.assignmentId,
        courseCode: selectedCourse.courseCode,
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
      setCompleted(true);
      toast.fire({ icon: 'success', title: 'Evaluation submitted' });
      window.setTimeout(() => navigate('/student/evaluations'), 1400);
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Submission failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Evaluation Wizard"
        subtitle={selectedCourse ? `${selectedCourse.courseCode} - ${selectedCourse.courseName}` : 'Select a course to begin.'}
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="glass-panel overflow-hidden">
          <WizardHeader step={step} progress={step === 2 ? progress : step === 3 ? 100 : 12} />

          <div className="p-5 sm:p-7">
            <AnimatePresence mode="wait">
              {completed ? (
                <CompletionScreen key="complete" />
              ) : step === 1 ? (
                <motion.section key="select" {...motionProps}>
                  <div className="mb-5">
                    <p className="text-sm font-semibold uppercase text-huGreen">Step 1</p>
                    <h2 className="mt-1 text-2xl font-bold text-huText">Choose your evaluation</h2>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-3">
                    <label>
                      <span className="mb-1 block text-sm font-semibold text-slate-700">Semester</span>
                      <select className="input" value={selectedCourse?.semester || ''} disabled>
                        <option>{selectedCourse?.semester || profile?.semester || 'Current semester'}</option>
                      </select>
                    </label>
                    <label>
                      <span className="mb-1 block text-sm font-semibold text-slate-700">Course</span>
                      <select className="input" value={selectedAssignmentId} onChange={(e) => setSelectedAssignmentId(e.target.value)}>
                        {courses.filter((course) => !course.evaluated).map((course) => (
                          <option key={course.assignmentId} value={course.assignmentId}>
                            {course.courseCode} - {course.courseName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="mb-1 block text-sm font-semibold text-slate-700">Lecturer</span>
                      <select className="input" value={selectedCourse?.lecturerName || ''} disabled>
                        <option>{selectedCourse?.lecturerName || 'Assigned lecturer'}</option>
                      </select>
                    </label>
                  </div>
                  <button className="btn-primary mt-7" type="button" disabled={!selectedCourse} onClick={() => setStep(2)}>
                    <Sparkles size={16} /> Start Questions
                  </button>
                </motion.section>
              ) : step === 2 ? (
                <motion.section key={currentQuestion?.questionId || 'question'} {...motionProps}>
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase text-huGreen">Question {questionIndex + 1} of {questions.length}</p>
                      <h2 className="mt-1 text-2xl font-bold text-huText">{currentQuestion?.category || 'Evaluation'}</h2>
                    </div>
                    <Badge label={progress >= 75 ? 'Almost done' : 'In progress'} />
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
                    <p className="text-xl font-bold leading-relaxed text-huText">{currentQuestion?.questionText || 'No active questions found.'}</p>
                    {currentQuestion ? (
                      <SliderRating
                        value={responses[currentQuestion.questionId] || 0}
                        onChange={(value) => setResponses({ ...responses, [currentQuestion.questionId]: value })}
                        allowZero
                      />
                    ) : null}
                  </div>
                  <div className="mt-6 flex flex-wrap justify-between gap-3">
                    <button className="btn-secondary" type="button" onClick={() => questionIndex === 0 ? setStep(1) : setQuestionIndex(questionIndex - 1)}>
                      <ChevronLeft size={16} /> Back
                    </button>
                    <button
                      className="btn-primary"
                      type="button"
                      onClick={() => questionIndex + 1 >= questions.length ? setStep(3) : setQuestionIndex(questionIndex + 1)}
                      disabled={!questions.length || !responses[currentQuestion?.questionId]}
                    >
                      {questionIndex + 1 >= questions.length ? 'Review' : 'Next'} <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.section>
              ) : (
                <motion.section key="review" {...motionProps}>
                  <div className="mb-5">
                    <p className="text-sm font-semibold uppercase text-huGreen">Step 3</p>
                    <h2 className="mt-1 text-2xl font-bold text-huText">Final details</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Overall label="Overall course rating" value={overall.courseOverallRating} onChange={(value) => setOverall({ ...overall, courseOverallRating: value })} />
                    <Overall label="Overall lecturer rating" value={overall.lecturerOverallRating} onChange={(value) => setOverall({ ...overall, lecturerOverallRating: value })} />
                    <Select label="Would you recommend this course?" value={overall.recommendation} options={['Yes', 'Maybe', 'No']} onChange={(value) => setOverall({ ...overall, recommendation: value })} />
                    <Select label="Attendance rate" value={overall.attendanceRate} options={['75-100%', '50-74%', 'Less than 50%']} onChange={(value) => setOverall({ ...overall, attendanceRate: value })} />
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <Comment label="What did you find most valuable?" value={comments.valuable} onChange={(value) => setComments({ ...comments, valuable: value })} />
                    <Comment label="What should be improved?" value={comments.improve} onChange={(value) => setComments({ ...comments, improve: value })} />
                    <Comment label="What topics or skills do you wish were covered?" value={comments.missing} onChange={(value) => setComments({ ...comments, missing: value })} />
                    <Comment label="Any other comments?" value={comments.other} onChange={(value) => setComments({ ...comments, other: value })} />
                  </div>
                  <label className="mt-5 flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={overall.anonymous} onChange={(e) => setOverall({ ...overall, anonymous: e.target.checked })} />
                    Submit anonymously
                  </label>
                  <div className="mt-6 flex flex-wrap justify-between gap-3">
                    <button className="btn-secondary" type="button" onClick={() => setStep(2)}><ChevronLeft size={16} /> Back</button>
                    <button className="btn-primary" type="button" disabled={saving || !selectedCourse} onClick={submit}><Send size={16} /> Submit Evaluation</button>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="panel p-5">
            <p className="text-sm font-semibold uppercase text-slate-500">Progress</p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-huGreen to-huBlue transition-all duration-500" style={{ width: `${step === 1 ? 12 : step === 2 ? progress : 100}%` }} />
            </div>
            <p className="mt-3 text-sm text-slate-600">{step === 2 ? `Question ${questionIndex + 1} of ${questions.length}` : step === 3 ? 'Ready to submit' : 'Course selection'}</p>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-xs font-bold uppercase text-slate-400">Level {step}</span>
              <span className="rounded-full bg-huBlue/10 px-3 py-1 text-xs font-black text-huBlue">{answeredRatings.length * 100} XP</span>
            </div>
          </div>
          <div className="panel p-5">
            <div className="flex items-center gap-3">
              <Award className="text-huGold" />
              <div>
                <p className="font-bold text-huText">Feedback Champion</p>
                <p className="text-sm text-slate-500">{answeredRatings.length ? `Average answer: ${answeredAverage}/5` : 'Your first badge is ready'}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

const motionProps = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -14 },
  transition: { duration: 0.25 }
};

function WizardHeader({ step, progress }) {
  return (
    <div className="border-b border-white/70 bg-white/70 p-5">
      <div className="flex flex-wrap gap-3">
        {['Select', 'Questions', 'Submit'].map((label, index) => (
          <div key={label} className={`rounded-full px-4 py-2 text-sm font-bold ${step === index + 1 ? 'bg-huGreen text-white' : 'bg-white text-slate-600'}`}>
            {index + 1}. {label}
          </div>
        ))}
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-huGreen to-huBlue transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function SliderRating({ value, onChange, allowZero = false }) {
  const copy = ratingCopy(value);
  return (
    <div className="mt-7">
      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
        {[1, 2, 3, 4, 5].map((number) => {
          const active = number <= value;
          return (
            <motion.button
              key={number}
              type="button"
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onChange(number)}
              className={`grid h-11 w-11 place-items-center rounded-lg transition sm:h-12 sm:w-12 ${active ? 'bg-huGold/15 text-huGold' : 'bg-slate-50 text-slate-300 hover:text-huGold/60'}`}
              aria-label={`Rate ${number} out of 5`}
            >
              <Star size={26} fill={active ? 'currentColor' : 'none'} />
            </motion.button>
          );
        })}
      </div>
      <div className="mt-5 rounded-lg bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between text-sm font-semibold">
          <span className="text-slate-400">{allowZero ? 'Not rated' : '1'}</span>
          <motion.span key={value} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`rounded-full px-3 py-1 font-black ${copy.style}`}>{value || 0} / 5 &bull; {copy.label}</motion.span>
          <span className="text-slate-400">5</span>
        </div>
        <input className="w-full cursor-pointer accent-huGreen" type="range" min={allowZero ? 0 : 1} max="5" step="1" value={value} onChange={(e) => onChange(Number(e.target.value))} />
        <div className="mt-2 flex justify-between px-0.5 text-[10px] font-bold text-slate-400">{(allowZero ? [0, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5]).map((number) => <span key={number}>{number}</span>)}</div>
      </div>
    </div>
  );
}

function ratingCopy(value) {
  if (value === 5) return { label: 'Excellent', style: 'bg-huGreen/10 text-huGreen' };
  if (value === 4) return { label: 'Very good', style: 'bg-huBlue/10 text-huBlue' };
  if (value === 3) return { label: 'Good', style: 'bg-yellow-100 text-yellow-700' };
  if (value === 2) return { label: 'Needs work', style: 'bg-orange-100 text-orange-700' };
  if (value === 1) return { label: 'Poor', style: 'bg-red-100 text-red-700' };
  return { label: 'Choose', style: 'bg-slate-200 text-slate-500' };
}

function Overall({ label, value, onChange }) {
  return (
    <div>
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <SliderRating value={value} onChange={onChange} />
    </div>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((item) => <option key={item}>{item}</option>)}
      </select>
    </label>
  );
}

function Comment({ label, value, onChange }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      <textarea className="input min-h-28" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Badge({ label }) {
  return <span className="inline-flex rounded-full bg-huBlue/10 px-3 py-1 text-sm font-bold text-huBlue">{label}</span>;
}

function CompletionScreen() {
  return (
    <motion.div {...motionProps} className="relative overflow-hidden py-12 text-center">
      {Array.from({ length: 18 }).map((_, index) => (
        <span
          key={index}
          className="confetti-piece absolute top-5 h-3 w-2 rounded-sm"
          style={{
            left: `${8 + index * 5}%`,
            backgroundColor: ['#008751', '#1E73BE', '#C9932A'][index % 3],
            animationDelay: `${index * 35}ms`
          }}
        />
      ))}
      <PartyPopper className="mx-auto text-huGold" size={52} />
      <h2 className="mt-4 text-3xl font-black text-huText">🎉 Thank You</h2>
      <p className="mx-auto mt-3 max-w-md text-slate-600">Your feedback helps improve education quality.</p>
    </motion.div>
  );
}
