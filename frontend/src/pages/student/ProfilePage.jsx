import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../context/AuthContext';

export default function ProfilePage() {
  const { profile, user } = useAuth();
  const entries = profile ? Object.entries(profile).filter(([key]) => !['_id', '__v', 'createdAt', 'updatedAt', 'password'].includes(key)) : [];
  return (
    <>
      <PageHeader title="Profile" subtitle="Your academic profile loaded automatically after login." />
      <div className="panel p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="Login ID" value={user?.loginId} />
          {entries.map(([key, value]) => <Info key={key} label={key} value={value} />)}
        </div>
      </div>
    </>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-md bg-stone-50 p-3">
      <p className="text-xs font-semibold uppercase text-stone-500">{label.replace(/([A-Z])/g, ' $1')}</p>
      <p className="mt-1 text-sm font-medium text-stone-800">{String(value || 'N/A')}</p>
    </div>
  );
}
