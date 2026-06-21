import { useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  UserRound
} from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../utils/alerts';
import logo from '../../hormuud logo.png';

const emptyPasswords = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function ProfilePage() {
  const { profile, user } = useAuth();
  const [passwords, setPasswords] = useState(emptyPasswords);
  const [visible, setVisible] = useState({ currentPassword: false, newPassword: false, confirmPassword: false });
  const [saving, setSaving] = useState(false);

  const displayName = profile?.fullName || (user?.role === 'admin' ? 'System Administrator' : user?.loginId) || 'Account';
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const role = user?.role?.replace('_', ' ') || 'user';
  const details = useMemo(() => profileDetails(user, profile), [user, profile]);
  const rules = passwordRules(passwords.newPassword);
  const strength = rules.filter((rule) => rule.valid).length;
  const canSubmit = passwords.currentPassword
    && strength === 4
    && passwords.newPassword === passwords.confirmPassword
    && !saving;

  const updatePassword = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      const { data } = await api.put('/auth/change-password', passwords);
      if (data.token) localStorage.setItem('hucems_token', data.token);
      setPasswords(emptyPasswords);
      toast.fire({ icon: 'success', title: 'Password updated successfully' });
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Password update failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="My Profile" subtitle="View your official university information and manage your account password securely." />

      <section className="overflow-hidden rounded-lg bg-gradient-to-r from-huGreen to-huGreenDark text-white shadow-soft">
        <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <img src={logo} alt="Hormuud University" className="absolute right-5 top-5 hidden h-16 w-16 rounded-lg bg-white p-2 opacity-90 shadow-lg sm:block" />
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg border border-white/30 bg-white/15 text-2xl font-black backdrop-blur">{initials}</div>
          <div className="min-w-0 sm:pr-20">
            <p className="text-xs font-bold uppercase text-white/65">Hormuud University Account</p>
            <h2 className="mt-1 break-words text-2xl font-black">{displayName}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold capitalize">{role}</span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">ID: {user?.loginId}</span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold capitalize">{user?.status || 'active'}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="panel overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-100 p-5">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-huBlue/10 text-huBlue"><UserRound size={20} /></span>
            <div><h2 className="font-bold text-huText">Official Information</h2><p className="text-sm text-slate-500">Information loaded from your existing university record.</p></div>
          </div>
          <div className="grid gap-px bg-slate-100 sm:grid-cols-2">
            {details.map((item) => <ProfileDetail key={item.label} {...item} />)}
          </div>
          <div className="flex gap-3 border-t border-slate-100 bg-huBlue/5 p-4 text-sm text-slate-600">
            <ShieldCheck className="mt-0.5 shrink-0 text-huBlue" size={18} />
            <p>Your name, role, faculty, department, class, and university ID are protected institutional records and cannot be changed from this page.</p>
          </div>
        </section>

        <form onSubmit={updatePassword} className="panel overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-100 p-5">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-huGreen/10 text-huGreen"><KeyRound size={20} /></span>
            <div><h2 className="font-bold text-huText">Change Password</h2><p className="text-sm text-slate-500">Confirm your current password before setting a new one.</p></div>
          </div>
          <div className="space-y-4 p-5">
            <PasswordField label="Current password" name="currentPassword" autoComplete="current-password" value={passwords.currentPassword} visible={visible.currentPassword} onToggle={() => setVisible({ ...visible, currentPassword: !visible.currentPassword })} onChange={(value) => setPasswords({ ...passwords, currentPassword: value })} />
            <PasswordField label="New password" name="newPassword" autoComplete="new-password" value={passwords.newPassword} visible={visible.newPassword} onToggle={() => setVisible({ ...visible, newPassword: !visible.newPassword })} onChange={(value) => setPasswords({ ...passwords, newPassword: value })} />

            <div>
              <div className="mb-2 flex gap-1">{[1, 2, 3, 4].map((level) => <span key={level} className={`h-1.5 flex-1 rounded-full ${strength >= level ? (strength >= 4 ? 'bg-huGreen' : 'bg-huBlue') : 'bg-slate-200'}`} />)}</div>
              <div className="grid gap-1 text-xs sm:grid-cols-2">
                {rules.map((rule) => <span key={rule.label} className={`flex items-center gap-1.5 ${rule.valid ? 'text-huGreen' : 'text-slate-400'}`}><CheckCircle2 size={13} />{rule.label}</span>)}
              </div>
            </div>

            <PasswordField label="Confirm new password" name="confirmPassword" autoComplete="new-password" value={passwords.confirmPassword} visible={visible.confirmPassword} onToggle={() => setVisible({ ...visible, confirmPassword: !visible.confirmPassword })} onChange={(value) => setPasswords({ ...passwords, confirmPassword: value })} />
            {passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword ? <p className="text-xs font-semibold text-red-600">Passwords do not match.</p> : null}

            <button className="btn-primary w-full" disabled={!canSubmit}><LockKeyhole size={17} />{saving ? 'Updating password...' : 'Update My Password'}</button>
          </div>
          <div className="border-t border-slate-100 bg-slate-50 p-4 text-xs leading-5 text-slate-500">For your security, this action changes only the password for account <b className="text-slate-700">{user?.loginId}</b>. University profile data is not modified.</div>
        </form>
      </div>
    </>
  );
}

function profileDetails(user, profile) {
  const common = [
    { label: 'Full Name', value: profile?.fullName || (user?.role === 'admin' ? 'System Administrator' : 'Not available'), icon: UserRound },
    { label: 'Login ID', value: user?.loginId, icon: KeyRound },
    { label: 'Account Role', value: user?.role?.replace('_', ' '), icon: ShieldCheck },
    { label: 'Account Status', value: user?.status, icon: CheckCircle2 }
  ];
  if (user?.role === 'student') return [
    ...common,
    { label: 'Student ID', value: profile?.studentId, icon: GraduationCap },
    { label: 'Faculty', value: profile?.faculty, icon: Building2 },
    { label: 'Department', value: profile?.department, icon: Building2 },
    { label: 'Class', value: profile?.className, icon: GraduationCap },
    ...(profile?.email ? [{ label: 'Email', value: profile.email, icon: UserRound }] : [])
  ];
  if (user?.role === 'lecturer') return [
    ...common,
    { label: 'Lecturer ID', value: profile?.lecturerId, icon: GraduationCap },
    { label: 'University Position', value: 'Lecturer', icon: Building2 },
    { label: 'Faculty', value: profile?.faculty, icon: Building2 },
    { label: 'Department', value: profile?.department, icon: Building2 },
    { label: 'Assigned Classes', value: profile?.assignedClasses, icon: GraduationCap },
    { label: 'Assigned Courses', value: profile?.assignedCourses, icon: GraduationCap }
  ];
  return [...common, { label: 'Access Scope', value: 'University Administration', icon: Building2 }];
}

function passwordRules(password) {
  return [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'Upper and lowercase', valid: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: 'Contains a number', valid: /\d/.test(password) },
    { label: 'Contains a symbol', valid: /[^A-Za-z0-9]/.test(password) }
  ];
}

function ProfileDetail({ label, value, icon: Icon }) {
  return <div className="flex min-h-24 gap-3 bg-white p-5"><Icon className="mt-0.5 shrink-0 text-huGreen" size={18} /><div><p className="text-xs font-bold uppercase text-slate-400">{label}</p><p className="mt-2 font-semibold capitalize text-huText">{value || 'Not available'}</p></div></div>;
}

function PasswordField({ label, name, value, visible, onToggle, onChange, autoComplete }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      <span className="relative block">
        <input className="input pr-11" name={name} type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} required />
        <button type="button" title={visible ? 'Hide password' : 'Show password'} aria-label={visible ? 'Hide password' : 'Show password'} onClick={onToggle} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-huGreen">{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button>
      </span>
    </label>
  );
}
