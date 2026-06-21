import {
  BarChart3,
  BookOpen,
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
  Settings,
  Upload,
  UserRound,
  Users
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import logo from '../hormuud logo.png';

const adminLinks = [
  ['Dashboard', '/admin', Home],
  ['Students', '/admin/students', Users],
  ['Lecturers', '/admin/lecturers', GraduationCap],
  ['Courses', '/admin/courses', BookOpen],
  ['Course Assignments', '/admin/assignments', ClipboardList],
  ['Evaluation Questions', '/admin/questions', HelpCircle],
  ['Evaluations', '/admin/evaluations', FileText],
  ['Class Evaluations', '/admin/class-evaluations', ClipboardPenLine],
  ['Reports', '/admin/reports', FileDown],
  ['Analytics', '/admin/analytics', BarChart3],
  ['Profile', '/admin/profile', UserRound],
  ['Import CSV', '/admin/import', Upload],
  ['Settings', '/admin/settings', Settings]
];

const studentLinks = [
  ['Dashboard', '/student', Home],
  ['My Courses', '/student/courses', BookOpen],
  ['Submitted Evaluations', '/student/evaluations', ClipboardList],
  ['Profile', '/student/profile', UserRound]
];

const lecturerLinks = [
  ['Dashboard', '/lecturer', Gauge],
  ['My Evaluation Summary', '/lecturer/summary', BarChart3],
  ['Evaluate My Classes', '/lecturer/class-evaluation', ClipboardPenLine],
  ['Course Reports', '/lecturer/reports', FileText],
  ['Profile', '/lecturer/profile', UserRound],
  ['Download Report', '/lecturer/download', FileDown]
];

const getLinks = (role) => {
  if (role === 'student') return studentLinks;
  if (role === 'lecturer') return lecturerLinks;
  return adminLinks;
};

export default function AppLayout() {
  const { user, profile, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const links = getLinks(user?.role);
  const profilePath = user?.role === 'student' ? '/student/profile' : user?.role === 'lecturer' ? '/lecturer/profile' : '/admin/profile';

  const doLogout = () => {
    logout();
    navigate('/login');
  };

  const Sidebar = (
    <aside className="flex h-full w-[min(18rem,calc(100vw-2rem))] flex-col bg-gradient-to-b from-huGreen to-huGreenDark text-white">
      <div className="border-b border-white/10 p-5">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Hormuud University" className="h-12 w-12 rounded-xl bg-white object-contain p-1.5 shadow-lg" />
          <div>
            <div className="text-xl font-extrabold leading-tight">HUCEMS</div>
            <div className="text-sm text-white/75">Hormuud University</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {links.map(([label, to, Icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin' || to === '/student' || to === '/lecturer'}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-white text-huGreen shadow-sm' : 'text-white/82 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <button onClick={doLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-white/10">
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );

  return (
    <div className="brand-gradient min-h-screen">
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">{Sidebar}</div>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div className="relative h-full">{Sidebar}</div>
        </div>
      ) : null}
      <main className="min-w-0 lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 min-w-0 items-center justify-between border-b border-white/70 bg-white/80 px-3 backdrop-blur-xl sm:px-6">
          <button className="btn-secondary px-3 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={18} />
          </button>
          <div className="hidden lg:block">
            <p className="text-sm font-semibold text-huText">{profile?.fullName || user?.loginId}</p>
            <p className="text-xs capitalize text-slate-500">{user?.role?.replace('_', ' ')}</p>
          </div>
          <div className="min-w-0 flex-1 px-3 lg:hidden"><p className="truncate text-center text-sm font-semibold text-huText">{profile?.fullName || user?.loginId}</p></div>
          <NavLink className="btn-secondary px-3 lg:hidden" to={profilePath} aria-label="Open profile"><UserRound size={18} /></NavLink>
        </header>
        <div className="min-w-0 overflow-x-hidden p-3 sm:p-5 xl:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
