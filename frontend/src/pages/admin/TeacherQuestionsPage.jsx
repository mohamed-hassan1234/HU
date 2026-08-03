import { useEffect, useState } from 'react';
import { HelpCircle, Pencil, Plus, Trash2, Users } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import SearchableSelect from '../../components/SearchableSelect';
import { confirmDelete, toast } from '../../utils/alerts';

const ALL_TEACHERS = '__all__';
const inputTypes = ['likert', 'star', 'radio', 'textarea'];
const emptyForm = {
  questionText: '',
  category: 'Teacher-Specific Questions',
  inputType: 'likert',
  options: '',
  order: 0,
  status: 'active',
  courseCode: ''
};

export default function TeacherQuestionsPage() {
  const [lecturers, setLecturers] = useState([]);
  const [selectedLecturer, setSelectedLecturer] = useState('');
  const [courses, setCourses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const isAllTeachers = selectedLecturer === ALL_TEACHERS;

  useEffect(() => {
    api.get('/lecturers', { params: { limit: 500 } })
      .then((res) => setLecturers(res.data.data || []))
      .catch((error) => toast.fire({ icon: 'error', title: error.response?.data?.message || 'Failed to load teachers' }));
  }, []);

  const load = async (lecturerId) => {
    if (!lecturerId) {
      setQuestions([]);
      setCourses([]);
      return;
    }
    try {
      if (lecturerId === ALL_TEACHERS) {
        const questionsRes = await api.get('/questions', { params: { scope: 'all-teachers' } });
        setQuestions(questionsRes.data.data || []);
        setCourses([]);
        return;
      }
      const [questionsRes, assignmentsRes] = await Promise.all([
        api.get('/questions', { params: { scope: 'lecturer', lecturerId } }),
        api.get('/assignments', { params: { lecturerId, limit: 200 } })
      ]);
      setQuestions(questionsRes.data.data || []);
      setCourses(assignmentsRes.data.data || []);
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Failed to load teacher questions' });
    }
  };

  const selectLecturer = (lecturerId) => {
    setSelectedLecturer(lecturerId);
    load(lecturerId);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (question) => {
    setEditing(question);
    setForm({
      questionText: question.questionText || '',
      category: question.category || emptyForm.category,
      inputType: question.inputType || 'likert',
      options: (question.options || []).join('|'),
      order: question.order || 0,
      status: question.status || 'active',
      courseCode: question.courseCode || ''
    });
    setModalOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.questionText.trim() || !selectedLecturer) return;
    try {
      const payload = isAllTeachers
        ? { ...form, scope: 'all-teachers' }
        : { ...form, scope: 'lecturer', lecturerId: selectedLecturer };
      if (editing) await api.put(`/questions/${editing._id}`, payload);
      else await api.post('/questions', payload);
      toast.fire({ icon: 'success', title: editing ? 'Question updated' : 'Question added' });
      setModalOpen(false);
      load(selectedLecturer);
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Save failed' });
    }
  };

  const remove = async (question) => {
    const result = await confirmDelete();
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/questions/${question._id}`);
      toast.fire({ icon: 'success', title: 'Question deleted' });
      load(selectedLecturer);
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Delete failed' });
    }
  };

  return (
    <>
      <PageHeader
        title="Teacher Questions"
        subtitle="Write extra evaluation questions for one teacher, or for all teachers at once. These appear alongside the standard evaluation questions on the relevant course evaluation forms."
      />
      <div className="panel mb-5 p-4">
        <SearchableSelect
          value={selectedLecturer}
          onChange={selectLecturer}
          options={[
            { value: ALL_TEACHERS, label: 'All Teachers (shared question, applies to every teacher)' },
            ...lecturers.map((item) => ({ value: item.lecturerId, label: `${item.lecturerId} - ${item.fullName}` }))
          ]}
          placeholder="Select a teacher or All Teachers"
          label="Select a teacher"
        />
      </div>

      {!selectedLecturer ? (
        <div className="panel p-8 text-center text-sm text-slate-500">Select a teacher, or "All Teachers", above to view or write evaluation questions.</div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
            <h2 className="flex items-center gap-2 font-bold text-huText">
              {isAllTeachers ? <Users size={18} /> : null}
              {isAllTeachers ? 'Shared questions for all teachers' : 'Questions for this teacher'}
            </h2>
            <button className="btn-primary" onClick={openCreate}><Plus size={16} />Add Question</button>
          </div>
          {isAllTeachers ? (
            <p className="border-b border-slate-100 bg-amber-50 px-4 py-2 text-xs text-amber-700">
              Editing or deleting a question here changes it for every teacher, including teachers added later.
            </p>
          ) : null}
          {questions.length ? (
            <div className="divide-y divide-slate-100">
              {questions.map((question) => (
                <div key={question._id} className="flex items-start justify-between gap-4 p-4">
                  <div>
                    <p className="font-semibold text-slate-800">{question.questionText}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {question.category} &bull; {question.inputType} &bull;{' '}
                      {question.scope === 'all-teachers' ? (
                        <span className="font-semibold text-huBlue">Shared &bull; All Teachers</span>
                      ) : (
                        question.courseCode || 'All courses'
                      )}{' '}
                      &bull; <span className={question.status === 'active' ? 'text-huGreen' : 'text-slate-400'}>{question.status}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button className="btn-secondary px-3" onClick={() => openEdit(question)} aria-label="Edit"><Pencil size={15} /></button>
                    <button className="btn-danger px-3" onClick={() => remove(question)} aria-label="Delete"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">
              <HelpCircle className="mx-auto mb-2 text-slate-300" size={28} />
              {isAllTeachers ? 'No shared questions written yet.' : 'No questions written for this teacher yet.'}
            </div>
          )}
        </div>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form onSubmit={submit} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-huText">{editing ? 'Edit Question' : 'Add Question'}</h2>
              <button type="button" className="btn-secondary px-3" onClick={() => setModalOpen(false)}>Close</button>
            </div>
            <div className="grid gap-4">
              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Question Text</span>
                <textarea className="input min-h-24" value={form.questionText} onChange={(e) => setForm({ ...form, questionText: e.target.value })} required />
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Category</span>
                <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Answer Type</span>
                  <SearchableSelect value={form.inputType} onChange={(value) => setForm({ ...form, inputType: value })} options={inputTypes} placeholder="Select" label="Answer Type" />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Order</span>
                  <input className="input" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
                </label>
              </div>
              {form.inputType === 'radio' ? (
                <label>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Options (use | separator)</span>
                  <input className="input" value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} placeholder="Option A|Option B|Option C" />
                </label>
              ) : null}
              {!isAllTeachers ? (
                <label>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Applies To</span>
                  <SearchableSelect
                    value={form.courseCode}
                    onChange={(value) => setForm({ ...form, courseCode: value })}
                    options={[{ value: '', label: 'All courses taught by this teacher' }, ...courses.map((item) => ({ value: item.courseCode, label: `${item.courseCode} - ${item.courseName}` }))]}
                    placeholder="All courses taught by this teacher"
                    label="Applies To"
                  />
                </label>
              ) : (
                <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">This question will apply to every teacher and every course automatically.</p>
              )}
              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
                <SearchableSelect value={form.status} onChange={(value) => setForm({ ...form, status: value })} options={['active', 'inactive']} placeholder="Select" label="Status" />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn-primary">Save</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
