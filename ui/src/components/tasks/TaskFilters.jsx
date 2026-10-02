import { Search, SlidersHorizontal, X } from 'lucide-react'

const selectClass = 'field-input min-w-32 py-2'

export default function TaskFilters({ filters, onChange }) {
  const update = (key, value) => onChange({ ...filters, [key]: value })
  const hasFilters = Object.values(filters).some(Boolean)
  return <div className="rounded-xl border bg-white p-3 shadow-sm"><div className="flex flex-col gap-2 lg:flex-row lg:items-center">
    <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className="field-input pl-9" placeholder="Search by task name or ID…" value={filters.search} onChange={(event) => update('search', event.target.value)} /></div>
    <div className="flex flex-wrap gap-2"><label className="sr-only" htmlFor="status-filter">Status</label><select id="status-filter" className={selectClass} value={filters.status} onChange={(event) => update('status', event.target.value)}><option value="">All statuses</option><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select>
      <label className="sr-only" htmlFor="priority-filter">Priority</label><select id="priority-filter" className={selectClass} value={filters.priority} onChange={(event) => update('priority', event.target.value)}><option value="">All priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
      <label className="sr-only" htmlFor="due-filter">Due date sort</label><select id="due-filter" className={selectClass} value={filters.due_date_order} onChange={(event) => update('due_date_order', event.target.value)}><option value="">Priority order</option><option value="asc">Due date: earliest</option><option value="desc">Due date: latest</option></select>
      {hasFilters && <button onClick={() => onChange({ search: '', status: '', priority: '', due_date_order: '' })} className="inline-flex items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" />Clear</button>}
    </div>
  </div></div>
}
