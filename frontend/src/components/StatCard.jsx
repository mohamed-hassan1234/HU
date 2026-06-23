export default function StatCard({ title, value, icon: Icon, accent = 'green' }) {
  const color = accent === 'gold'
    ? 'bg-amber-50 text-huGold ring-amber-100'
    : accent === 'blue'
      ? 'bg-sky-50 text-huBlue ring-sky-100'
      : 'bg-emerald-50 text-huGreen ring-emerald-100';
  return (
    <div className="panel group relative overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-glass">
      <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-huGreen via-huBlue to-transparent opacity-70" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-huText">{value ?? 0}</p>
        </div>
        {Icon ? (
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ring-1 transition group-hover:scale-105 ${color}`}>
            <Icon size={21} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
