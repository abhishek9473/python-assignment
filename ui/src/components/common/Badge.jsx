import { PRIORITY, STATUS } from '../../lib/utils'

export function PriorityBadge({ priority }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${PRIORITY[priority]}`}>{priority}</span>
}

export function StatusBadge({ status }) {
  const item = STATUS[status]
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold text-slate-600 ${item.surface}`}><i className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />{item.label}</span>
}
