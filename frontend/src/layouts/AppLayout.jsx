import {
  BarChart3,
  BookOpen,
  Building2,
  ChevronRight,
  ClipboardList,
  ClipboardPenLine,
  FileDown,
  FileText,
  Gauge,
  GraduationCap,
  HelpCircle,
  Home,
  LogOut,
  Menu,
  ShieldCheck,
  Upload,
  UserRound,
  Users,
  X
} from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import logo from '../hormuud logo.png';

const adminLinks = [
  { section: 'Overview', label: 'Dashboard', to: '/admin', icon: Home },
  { section: 'Administration', label: 'User Management', to: '/admin/users', icon: ShieldCheck },
  { section: 'Management', label: 'Students', to: '/admin/students', icon: Users },
  { section: 'Management', label: 'Lecturers', to: '/admin/lecturers', icon: GraduationCap },
  { section: 'Management', label: 'Courses', to: '/admin/courses', icon: BookOpen },
  { section: 'Management', label: 'Course Assignments', to: '/admin/assignments', icon: ClipboardList },
  { section: 'University', label: 'Faculties', to: '/admin/faculties', icon: Building2 },
  { section: 'University', label: 'Departments', to: '/admin/departments', icon: Building2 },
  { section: 'University', label: 'Classes', to: '/admin/classes', icon: GraduationCap },
  { section: 'Evaluation', label: 'Evaluation Questions', to: '/admin/questions', icon: HelpCircle },
  { section: 'Evaluation', label: 'Evaluations', to: '/admin/evaluations', icon: FileText },
  { section: 'Evaluation', label: 'Class Evaluations', to: '/admin/class-evaluations', icon: ClipboardPenLine },
  { section: 'Insights', label: 'Reports', to: '/admin/reports', icon: FileDown },
  { section: 'Insights', label: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
  { section: 'Account', label: 'Profile', to: '/admin/profile', icon: UserRound },
  { section: 'Account', label: 'Import CSV', to: '/admin/import', icon: Upload }
];

const registrationLinks = [
  { section: 'Overview', label: 'Dashboard', to: '/registration', icon: Home },
  { section: 'Department', label: 'Students', to: '/registration/students', icon: Users },
  { section: 'Department', label: 'Lecturers', to: '/registration/lecturers', icon: GraduationCap },
  { section: 'Department', label: 'Courses', to: '/registration/courses', icon: BookOpen },
  { section: 'Department', label: 'Course Assignments', to: '/registration/assignments', icon: ClipboardList },
  { section: 'Evaluation', label: 'Evaluation Questions', to: '/registration/questions', icon: HelpCircle },
  { section: 'Insights', label: 'Reports', to: '/registration/reports', icon: FileDown },
  { section: 'Insights', label: 'Analytics', to: '/registration/analytics', icon: BarChart3 },
  { section: 'Account', label: 'Profile', to: '/registration/profile', icon: UserRound }
];

const studentLinks = [
  { section: 'Overview', label: 'Dashboard', to: '/student', icon: Home },
  { section: 'Learning', label: 'My Courses', to: '/student/courses', icon: BookOpen },
  { section: 'Learning', label: 'Submitted Evaluations', to: '/student/evaluations', icon: ClipboardList },
  { section: 'Account', label: 'Profile', to: '/student/profile', icon: UserRound }
];

const lecturerLinks = [
  { section: 'Overview', label: 'Dashboard', to: '/lecturer', icon: Gauge },
  { section: 'Evaluation', label: 'My Evaluation Summary', to: '/lecturer/summary', icon: BarChart3 },
  { section: 'Evaluation', label: 'Evaluate My Classes', to: '/lecturer/class-evaluation', icon: ClipboardPenLine },
  { section: 'Evaluation', label: 'Course Reports', to: '/lecturer/reports', icon: FileText },
  { section: 'Account', label: 'Profile', to: '/lecturer/profile', icon: UserRound }
];

const getLinks = (role) => {
  if (role === 'student') return studentLinks;
  if (role === 'lecturer') return lecturerLinks;
  if (role === 'registration') return registrationLinks;
  return adminLinks;
};

const roleName = (role) => {
  if (role === 'lecturer') return 'Teacher';
  if (role === 'registration') return 'Registration Officer';
  if (role === 'department_head') return 'Department Head';
  return role?.replace('_', ' ') || 'User';
};

export default function AppLayout() {
  const { user, profile, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const links = getLinks(user?.role);
  const profilePath = user?.role === 'student'
    ? '/student/profile'
    : user?.role === 'lecturer'
      ? '/lecturer/profile'
      : user?.role === 'registration'
        ? '/registration/profile'
        : '/admin/profile';
  const currentPage = links.find((item) => item.to === location.pathname)?.label || 'Workspace';
  const sections = useMemo(() => [...new Set(links.map((item) => item.section))], [links]);

  const doLogout = () => {
    logout();
    navigate('/login');
  };

  const Sidebar = (
    <aside className="flex h-full w-[min(16.25rem,calc(100vw-2rem))] flex-col bg-[#064d35] text-white shadow-2xl">
      <div className="flex h-[70px] items-center gap-3 border-b border-white/10 px-5">
        <img src={logo} alt="Hormuud University" className="h-11 w-11 rounded-lg bg-white object-contain p-1 shadow-sm" />
        <div className="min-w-0">
          <div className="text-lg font-bold leading-tight tracking-wide">CTES</div>
          <div className="truncate text-[11px] text-emerald-100/75">Hormuud University</div>
        </div>
        <button className="ml-auto rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
          <X size={19} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section} className="mb-5">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-100/45">{section}</p>
            <div className="space-y-1">
              {links.filter((item) => item.section === section).map(({ label, to, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/admin' || to === '/student' || to === '/lecturer' || to === '/registration'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => `group flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition ${
                    isActive
                      ? 'bg-white text-huGreen shadow-sm'
                      : 'text-emerald-50/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={17} strokeWidth={isActive ? 2.4 : 1.8} />
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                      <ChevronRight size={13} className={`transition ${isActive ? 'opacity-60' : 'translate-x-[-3px] opacity-0 group-hover:translate-x-0 group-hover:opacity-50'}`} />
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button onClick={doLogout} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-emerald-50/75 transition hover:bg-red-500/15 hover:text-white">
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-huBg">
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">{Sidebar}</div>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div className="relative h-full w-fit">{Sidebar}</div>
        </div>
      ) : null}

      <main className="min-w-0 lg:pl-[16.25rem]">
        <header className="sticky top-0 z-20 flex h-[70px] min-w-0 items-center border-b border-slate-200 bg-white/95 px-3 shadow-[0_1px_2px_rgba(15,34,58,.04)] backdrop-blur sm:px-6">
          <button className="btn-secondary !p-2.5 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={18} />
          </button>

          <div className="ml-3 min-w-0 lg:ml-0">
            <p className="truncate text-sm font-semibold text-huText">{currentPage}</p>
            <p className="hidden text-xs text-slate-400 sm:block">Course and Teaching Evaluation System</p>
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
            <NavLink to={profilePath} className="flex min-w-0 items-center gap-2 rounded-md p-1.5 transition hover:bg-slate-100 sm:pr-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-huGreen to-huBlue text-xs font-bold uppercase text-white">
                {(profile?.fullName || user?.loginId || 'U').charAt(0)}
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block max-w-32 truncate text-xs font-semibold text-huText">{profile?.fullName || user?.loginId}</span>
                <span className="block text-[10px] capitalize text-slate-400">{roleName(user?.role)}</span>
              </span>
            </NavLink>
          </div>
        </header>

        <div className="min-w-0 overflow-x-hidden p-4 sm:p-5 xl:p-6">
          <Outlet />
        </div>

        <footer className="border-t border-slate-200 bg-white px-5 py-4 text-center text-xs text-slate-400 sm:text-left">
          © {new Date().getFullYear()} Hormuud University · Course and Teaching Evaluation System
        </footer>
      </main>
    </div>
  );
}
