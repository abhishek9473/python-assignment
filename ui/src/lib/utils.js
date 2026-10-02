export const STATUS = {
  pending: { label: 'Pending', dot: 'bg-slate-400', surface: 'bg-slate-100' },
  in_progress: { label: 'In Progress', dot: 'bg-amber-500', surface: 'bg-amber-50' },
  completed: { label: 'Completed', dot: 'bg-emerald-500', surface: 'bg-emerald-50' },
}

export const PRIORITY = {
  high: 'bg-rose-50 text-rose-700 ring-rose-200',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  low: 'bg-sky-50 text-sky-700 ring-sky-200',
}

export const formatDate = (value, options = { month: 'short', day: 'numeric', year: 'numeric' }) => {
  if (!value) return 'No due date'
  return new Intl.DateTimeFormat(undefined, options).format(new Date(`${value}T00:00:00`))
}

export const formatDateTime = (value) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value))

export const initials = (name = '?') => name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()

export const errorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  const data = error?.response?.data
  if (typeof data?.detail === 'string') return data.detail
  if (data && typeof data === 'object') return Object.values(data).flat().join(' ')
  return fallback
}
