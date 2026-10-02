import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, total, pageSize = 20, onChange }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null
  return <div className="flex items-center justify-between px-1 py-4 text-sm text-slate-500"><span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span><div className="flex items-center gap-2"><button className="icon-button border bg-white disabled:opacity-40" disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button><span>Page {page} of {pageCount}</span><button className="icon-button border bg-white disabled:opacity-40" disabled={page === pageCount} onClick={() => onChange(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button></div></div>
}
