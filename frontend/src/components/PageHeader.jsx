import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function PageHeader({ title, subtitle, actions }) {
  const location = useLocation();
  const homePath = `/${location.pathname.split('/').filter(Boolean)[0] || ''}`;

  return (
    <div className="mb-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-400">
          <Link to={homePath} className="transition hover:text-huGreen"><Home size={13} /></Link>
          <ChevronRight size={12} />
          <span className="text-slate-500">{title}</span>
        </div>
        <h1 className="break-words text-xl font-semibold tracking-tight text-huText sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="grid w-full grid-cols-1 gap-2 min-[480px]:grid-cols-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">{actions}</div> : null}
    </div>
  );
}
