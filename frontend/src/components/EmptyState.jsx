import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'No records found' }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-md border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
      <div>
        <Inbox className="mx-auto text-stone-400" />
        <p className="mt-3 text-sm font-semibold text-stone-600">{title}</p>
      </div>
    </div>
  );
}
