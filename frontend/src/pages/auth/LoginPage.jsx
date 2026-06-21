import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LockKeyhole, LogIn, User } from 'lucide-react';
import { roleHome, useAuth } from '../../context/AuthContext';
import { toast } from '../../utils/alerts';
import logo from '../../hormuud logo.png';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ loginId: '', password: '' });
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
    <div className="brand-gradient min-h-screen">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-huGreen p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(0,135,81,.96),rgba(30,115,190,.72)),url('https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center" />
          <div className="relative">
            <div className="flex items-center gap-4">
              <img src={logo} alt="Hormuud University" className="h-16 w-16 rounded-2xl bg-white object-contain p-2 shadow-2xl" />
              <div>
                <div className="text-3xl font-extrabold">HUCEMS</div>
                <p className="mt-1 max-w-lg text-white/80">Hormuud University Course Evaluation Management System</p>
              </div>
            </div>
          </div>
          <div className="relative max-w-xl">
            <h1 className="text-5xl font-black leading-tight">Course evaluation with clarity, trust, and action.</h1>
            <p className="mt-5 text-lg text-white/78">Students evaluate assigned courses once, while academic leaders track participation, rankings, and low-score warnings.</p>
          </div>
        </section>
        <section className="flex items-center justify-center p-5">
          <form onSubmit={submit} className="glass-panel w-full max-w-md p-6">
            <div className="mb-6 flex items-center gap-3">
              <img src={logo} alt="Hormuud University" className="h-14 w-14 rounded-2xl bg-white object-contain p-2 shadow" />
              <div>
                <p className="text-sm font-semibold uppercase text-huGreen">Hormuud University</p>
                <h1 className="mt-1 text-3xl font-bold text-huText">Sign in</h1>
              </div>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-stone-700">Login ID</span>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input className="input !pl-11" autoComplete="username" value={form.loginId} onChange={(e) => setForm({ ...form, loginId: e.target.value })} required />
              </div>
            </label>
            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-semibold text-stone-700">Password</span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input className="input !pl-11" autoComplete="current-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
            </label>
            <button className="btn-primary mt-6 w-full" disabled={loading}>
              <LogIn size={18} />
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
