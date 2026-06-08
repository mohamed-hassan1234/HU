import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LockKeyhole, LogIn, User } from 'lucide-react';
import { roleHome, useAuth } from '../../context/AuthContext';
import { toast } from '../../utils/alerts';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ loginId: 'admin', password: 'admin123' });
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={roleHome[user.role] || '/login'} replace />;

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const loggedIn = await login(form.loginId, form.password);
      toast.fire({ icon: 'success', title: 'Welcome to HUCEMS' });
      navigate(roleHome[loggedIn.role] || '/login', { replace: true });
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Login failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-huBg">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-huGreen p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(0,107,60,.96),rgba(31,91,69,.92)),url('https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center" />
          <div className="relative">
            <div className="text-3xl font-extrabold">HUCEMS</div>
            <p className="mt-2 max-w-lg text-white/80">Hormuud University Course Evaluation Management System</p>
          </div>
          <div className="relative max-w-xl">
            <h1 className="text-5xl font-black leading-tight">Course evaluation with clarity, trust, and action.</h1>
            <p className="mt-5 text-lg text-white/78">Students evaluate assigned courses once, while academic leaders track participation, rankings, and low-score warnings.</p>
          </div>
        </section>
        <section className="flex items-center justify-center p-5">
          <form onSubmit={submit} className="panel w-full max-w-md p-6">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase text-huGold">Hormuud University</p>
              <h1 className="mt-2 text-3xl font-bold text-stone-950">Sign in</h1>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-stone-700">Login ID</span>
              <div className="relative">
                <User className="absolute left-3 top-2.5 text-stone-400" size={18} />
                <input className="input pl-10" value={form.loginId} onChange={(e) => setForm({ ...form, loginId: e.target.value })} />
              </div>
            </label>
            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-semibold text-stone-700">Password</span>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-2.5 text-stone-400" size={18} />
                <input className="input pl-10" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            </label>
            <button className="btn-primary mt-6 w-full" disabled={loading}>
              <LogIn size={18} />
              {loading ? 'Signing in...' : 'Login'}
            </button>
            <div className="mt-5 rounded-md bg-stone-50 p-3 text-xs text-stone-600">
              Admin: admin / admin123<br />
              Student: ST001 / 123456<br />
              Lecturer: 2020 / 2020
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
