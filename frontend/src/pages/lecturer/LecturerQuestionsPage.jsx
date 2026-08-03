import { useEffect, useState } from 'react';
import { HelpCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import SearchableSelect from '../../components/SearchableSelect';
import { confirmDelete, toast } from '../../utils/alerts';

const inputTypes = ['likert', 'star', 'radio', 'textarea'];
const emptyForm = {
  questionText: '',
  category: "Lecturer's Own Questions",
  inputType: 'likert',
  options: '',
  order: 0,
  status: 'active',
  courseCode: ''
};

export default function LecturerQuestionsPage() {
  const [questions, setQuestions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => {
    try {
      const [questionsRes, optionsRes] = await Promise.all([
        api.get('/questions', { params: { mine: true } }),
        api.get('/class-evaluations/options')
      ]);
      setQuestions(questionsRes.data.data || []);
      setCourses(optionsRes.data.assignments || []);
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Failed to load your questions' });
    }
  };

  useEffect(() => {
    load();
  }, []);

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
    if (!form.questionText.trim()) return;
    try {
      if (editing) await api.put(`/questions/${editing._id}`, form);
      else await api.post('/questions', form);
      toast.fire({ icon: 'success', title: editing ? 'Question updated' : 'Question added' });
      setModalOpen(false);
      load();
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
      load();
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Delete failed' });
    }
  };

  return (
    <>
      <PageHeader
        title="My Evaluation Questions"
        subtitle="Add extra questions that appear only on your own course's evaluation form, alongside the university's standard questions."
        actions={<button className="btn-primary" onClick={openCreate}><Plus size={16} />Add Question</button>}
      />
      <div className="panel overflow-hidden">
        {questions.length ? (
          <div className="divide-y divide-slate-100">
            {questions.map((question) => (
              <div key={question._id} className="flex items-start justify-between gap-4 p-4">
                <div>
                  <p className="font-semibold text-slate-800">{question.questionText}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {question.category} &bull; {question.inputType} &bull; {question.courseCode || 'All my courses'} &bull; <span className={question.status === 'active' ? 'text-huGreen' : 'text-slate-400'}>{question.status}</span>
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
            You have not added any of your own evaluation questions yet.
          </div>
        )}
      </div>

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
              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Applies To</span>
                <SearchableSelect
                  value={form.courseCode}
                  onChange={(value) => setForm({ ...form, courseCode: value })}
                  options={[{ value: '', label: 'All my courses' }, ...courses.map((item) => ({ value: item.courseCode, label: `${item.courseCode} - ${item.courseName}` }))]}
                  placeholder="All my courses"
                  label="Applies To"
                />
              </label>
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
