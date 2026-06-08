import { Upload } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import { toast } from '../../utils/alerts';

const imports = [
  ['Import Students CSV', '/students/import-csv', 'student_id,full_name,faculty,department,class_name,semester,academic_year,email,password,status'],
  ['Import Lecturers CSV', '/lecturers/import-csv', 'lecturer_id,full_name,password,status'],
  ['Import Courses CSV', '/courses/import-csv', 'course_code,course_name,credit_hours,status'],
  ['Import Course Assignments CSV', '/assignments/import-csv', 'assignment_id,course_code,course_name,class_name,semester,academic_year,lecturer_id,lecturer_name,status'],
  ['Import Evaluation Questions CSV', '/questions/import-csv', 'question_id,question_text,category,input_type,options,order,status']
];

export default function ImportPage() {
  const upload = async (event, endpoint) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    try {
      const { data } = await api.post(endpoint, form);
      toast.fire({ icon: 'success', title: data.message || 'CSV imported' });
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Import failed' });
    } finally {
      event.target.value = '';
    }
  };

  return (
    <>
      <PageHeader title="Import CSV" subtitle="Upload CSV files using the supported HUCEMS column formats." />
      <div className="grid gap-4 lg:grid-cols-2">
        {imports.map(([label, endpoint, format]) => (
          <div key={endpoint} className="panel p-5">
            <h2 className="font-bold text-stone-900">{label}</h2>
            <p className="mt-2 break-words rounded-md bg-stone-50 p-3 font-mono text-xs text-stone-600">{format}</p>
            <label className="btn-primary mt-4 cursor-pointer">
              <Upload size={16} />
              {label}
              <input type="file" accept=".csv" className="hidden" onChange={(e) => upload(e, endpoint)} />
            </label>
          </div>
        ))}
      </div>
    </>
  );
}
