import {
  BarChart3,
  BookOpen,
  ClipboardList,
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
  Users,
  X
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const adminLinks = [
  ['Dashboard', '/admin', Home],
  ['Students', '/admin/students', Users],
  ['Lecturers', '/admin/lecturers', GraduationCap],
  ['Courses', '/admin/courses', BookOpen],
  ['Course Assignments', '/admin/assignments', ClipboardList],
  ['Evaluation Questions', '/admin/questions', HelpCircle],
  ['Evaluations', '/admin/evaluations', FileText],
  ['Reports', '/admin/reports', FileDown],
  ['Analytics', '/admin/analytics', BarChart3],
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
  ['Course Reports', '/lecturer/reports', FileText],
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

  const doLogout = () => {
    logout();
    navigate('/login');
  };

  const Sidebar = (
    <aside className="flex h-full w-72 flex-col bg-huGreen text-white">
      <div className="border-b border-white/10 p-5">
        <div className="text-xl font-extrabold">HUCEMS</div>
        <div className="mt-1 text-sm text-white/75">Hormuud University</div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {links.map(([label, to, Icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin' || to === '/student' || to === '/lecturer'}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-white text-huGreen' : 'text-white/82 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <button onClick={doLogout} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-white/10">
          <LogOut size={18} />
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
          <button className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div className="relative h-full">{Sidebar}</div>
        </div>
      ) : null}
      <main className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-stone-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button className="btn-secondary px-3 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={18} />
          </button>
          <div className="hidden lg:block">
            <p className="text-sm font-semibold text-stone-900">{profile?.fullName || user?.loginId}</p>
            <p className="text-xs capitalize text-stone-500">{user?.role?.replace('_', ' ')}</p>
          </div>
          <button className="btn-secondary px-3 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </header>
        <div className="p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
