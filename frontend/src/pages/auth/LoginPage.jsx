import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ClipboardList,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  ShieldCheck,
  UserRound
} from 'lucide-react';
import { roleHome, useAuth } from '../../context/AuthContext';
import { toast } from '../../utils/alerts';
import logo from '../../hormuud logo.png';
import image1 from '../../../image1.jpeg';
import image2 from '../../../image2.jpeg';

const sideCards = [
  { label: 'Course Evaluations', icon: ClipboardList },
  { label: 'Teaching Evaluations', icon: GraduationCap },
  { label: 'Quality Improvement', icon: BarChart3 }
];

const sliderImages = [
  { src: image1, alt: 'Hormuud University campus life' },
  { src: image2, alt: 'Hormuud University academic environment' }
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ loginId: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    sliderImages.forEach(({ src }) => {
      const img = new Image();
      img.src = src;
    });
    const timer = window.setInterval(() => {
      setActiveSlide((index) => (index + 1) % sliderImages.length);
    }, 4800);
    return () => window.clearInterval(timer);
  }, []);

  if (user) return <Navigate to={roleHome[user.role] || '/login'} replace />;

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const loggedIn = await login(form.loginId, form.password);
      toast.fire({ icon: 'success', title: 'Welcome to CTES' });
      navigate(roleHome[loggedIn.role] || '/login', { replace: true });
    } catch (error) {
      toast.fire({ icon: 'error', title: error.response?.data?.message || 'Login failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#f7fbf9] font-['Roboto'] text-slate-900">
      <header className="relative z-10 border-b border-slate-200/80 bg-white/95 shadow-[0_1px_18px_rgba(15,34,58,0.04)] backdrop-blur">
        <div className="mx-auto flex h-[70px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <img src={logo} alt="Hormuud University" className="h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16 lg:h-[70px] lg:w-[70px]" />
            <div className="min-w-0">
              <p className="truncate text-base font-black uppercase tracking-wide text-huGreen sm:text-lg">Hormuud University</p>
              <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">Course and Teaching Evaluation System (CTES)</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto grid w-full max-w-[1500px] flex-1 items-center px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12 lg:px-8 lg:py-12 xl:py-14">
        <section className="relative hidden min-h-[640px] flex-col justify-center overflow-hidden bg-gradient-to-br from-white via-[#f5fbf9] to-[#eef8f5] px-6 py-6 sm:rounded-[1.75rem] sm:px-10 lg:flex lg:min-h-[calc(100vh-118px)] lg:rounded-none lg:bg-transparent lg:px-10 lg:py-0 2xl:min-h-[760px]">
          <div className="pointer-events-none absolute -right-20 top-0 h-[520px] w-[520px] rounded-full border border-huGreen/10" />
          <div className="pointer-events-none absolute -right-6 top-16 h-[430px] w-[430px] rounded-full border border-huGreen/5" />
          <div className="relative z-[2] mx-auto w-full max-w-[460px] pt-0 lg:mx-0 lg:ml-12 xl:ml-16">
            <h1 className="text-6xl font-black leading-none tracking-tight text-huGreen sm:text-7xl lg:text-[4.6rem]">CTES</h1>
            <h2 className="mt-2 max-w-md text-2xl font-black leading-tight text-slate-950 lg:text-[1.45rem]">
              Course and Teaching Evaluation System
            </h2>
            <div className="mt-4 h-1 w-12 rounded-full bg-huGreen" />
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">
              CTES is an online platform designed to evaluate courses and teaching quality. Your feedback helps improve the learning and teaching experience.
            </p>

            <div className="mt-8 grid max-w-[360px] grid-cols-3 gap-4 sm:gap-6">
              {sideCards.map(({ label, icon: Icon }) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white/95 px-2 py-3 text-center shadow-[0_12px_30px_rgba(15,34,58,0.08)] backdrop-blur lg:py-2.5">
                  <Icon className="mx-auto text-huGreen" size={26} strokeWidth={1.9} />
                  <p className="mt-2 text-[10px] font-black leading-tight text-slate-800">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-[2] mt-8 w-full lg:mt-10">
            <div className="relative mx-auto w-full max-w-[1060px]">
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-slate-900 shadow-[0_22px_70px_rgba(15,34,58,0.16)]">
                {sliderImages.map((image, index) => {
                  const active = index === activeSlide;
                  return (
                    <img
                      key={image.src}
                      src={image.src}
                      alt={image.alt}
                      className={`absolute inset-0 h-full w-full object-cover object-center transition-all duration-[1600ms] ease-out ${
                        active ? 'scale-100 opacity-100 blur-0' : 'scale-105 opacity-0 blur-[2px]'
                      }`}
                    />
                  );
                })}
                <div className="absolute inset-0 bg-gradient-to-tr from-[#032f23]/50 via-black/10 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10" />
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-[2] flex items-center justify-center px-0 py-4 lg:min-h-[calc(100vh-118px)] lg:py-0 2xl:min-h-[760px]">
          <form onSubmit={submit} className="w-full max-w-[460px] rounded-2xl border border-slate-200 bg-white px-5 py-7 shadow-[0_20px_60px_rgba(15,34,58,0.12)] sm:px-8 lg:flex lg:min-h-[520px] lg:flex-col lg:justify-center lg:py-9 xl:min-h-[540px]">
            <div className="text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-huGreen/10 text-huGreen sm:h-24 sm:w-24">
                <UserRound size={48} strokeWidth={1.7} />
              </div>
              <h2 className="mt-5 text-2xl font-black text-slate-950">Welcome Back!</h2>
              <p className="mt-2 text-sm text-slate-500">Sign in to your CTES account</p>
            </div>

            <label className="mt-7 block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Username</span>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                <input
                  className="input !h-12 !rounded-lg !pl-12"
                  autoComplete="username"
                  placeholder="Enter your username"
                  value={form.loginId}
                  onChange={(e) => setForm({ ...form, loginId: e.target.value })}
                  required
                />
              </div>
            </label>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Password</span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                <input
                  className="input !h-12 !rounded-lg !px-12"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-huGreen"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <button className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-huGreen text-sm font-black text-white shadow-[0_12px_20px_rgba(7,139,86,0.22)] transition hover:bg-huGreenDark disabled:cursor-not-allowed disabled:opacity-60" disabled={loading}>
              <LockKeyhole size={18} />
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </section>
      </main>

      <footer className="hidden shrink-0 bg-gradient-to-r from-[#064d35] to-[#08784d] text-white lg:block">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 text-xs text-white/80 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Hormuud University. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-2"><ShieldCheck size={15} /> Privacy Policy</span>
            <span className="h-4 w-px bg-white/20" />
            <span>Terms of Use</span>
            <span className="h-4 w-px bg-white/20" />
            <span>Help Center</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
