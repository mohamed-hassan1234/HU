export default function StatCard({ title, value, icon: Icon, accent = 'green' }) {
  const color = accent === 'gold'
    ? 'bg-huGold/10 text-huGold'
    : accent === 'blue'
      ? 'bg-huBlue/10 text-huBlue'
      : 'bg-huGreen/10 text-huGreen';
  return (
    <div className="panel p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-glass">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-huText">{value ?? 0}</p>
        </div>
        {Icon ? (
          <div className={`grid h-11 w-11 place-items-center rounded-xl ${color}`}>
            <Icon size={21} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
