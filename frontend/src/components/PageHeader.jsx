export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-5 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="break-words text-xl font-bold text-huText sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
      </div>
      {actions ? <div className="grid w-full grid-cols-1 gap-2 min-[480px]:grid-cols-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">{actions}</div> : null}
    </div>
  );
}
