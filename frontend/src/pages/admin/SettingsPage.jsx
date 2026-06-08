import PageHeader from '../../components/PageHeader';

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="System configuration overview." />
      <div className="panel p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-stone-500">Database</p>
            <p className="mt-1 font-mono text-sm text-stone-800">mongodb://127.0.0.1:27017/hucems_db</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-stone-500">Evaluation Mode</p>
            <p className="mt-1 text-sm text-stone-800">Anonymous by default</p>
          </div>
        </div>
      </div>
    </>
  );
}
