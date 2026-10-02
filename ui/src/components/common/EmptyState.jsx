import { ClipboardList } from 'lucide-react'

export default function EmptyState({ title = 'No tasks found', message = 'Try adjusting your filters or create a new task.' }) {
  return <div className="grid min-h-40 place-items-center rounded-xl border border-dashed bg-white px-5 py-10 text-center"><div><ClipboardList className="mx-auto mb-3 h-7 w-7 text-slate-300" /><p className="font-semibold text-slate-700">{title}</p><p className="mt-1 text-sm text-slate-500">{message}</p></div></div>
}
