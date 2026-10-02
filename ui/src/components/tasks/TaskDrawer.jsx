import { useEffect, useState } from 'react'
import { CalendarDays, Clock3, Image as ImageIcon, Pencil, Trash2, X } from 'lucide-react'
import api from '../../lib/api'
import { PriorityBadge, StatusBadge } from '../common/Badge'
import Button from '../common/Button'
import CommentThread from './CommentThread'
import TaskForm from './TaskForm'
import { errorMessage, formatDate, formatDateTime } from '../../lib/utils'

export default function TaskDrawer({ taskId, user, onClose, onTaskChanged }) {
  const [task, setTask] = useState(null)
  const [tab, setTab] = useState('discussion')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)

  const load = async () => {
    if (!taskId) return
    setLoading(true)
    setError('')
    try { const { data } = await api.get(`/tasks/${taskId}/`); setTask(data) } catch (err) { setError(errorMessage(err, 'The task could not be loaded.')) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [taskId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!taskId) return null
  const updateStatus = async (status) => {
    try { const { data } = await api.patch(`/tasks/${task.id}/status/`, { status }); setTask((current) => ({ ...current, ...data })); onTaskChanged() } catch (err) { setError(errorMessage(err, 'Status could not be updated.')) }
  }
  const remove = async () => {
    if (!window.confirm(`Delete ${task.code}? This cannot be undone.`)) return
    try { await api.delete(`/tasks/${task.id}/`); onTaskChanged(); onClose() } catch (err) { setError(errorMessage(err, 'Task could not be deleted.')) }
  }
  return <><aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-xl flex-col border-l bg-white shadow-2xl" aria-label="Task details"><header className="flex items-start justify-between border-b px-5 py-4"><div className="min-w-0"><p className="text-xs font-bold tracking-wider text-indigo-600">{task?.code ?? 'TASK'}</p><h2 className="mt-1 line-clamp-2 text-lg font-bold text-slate-900">{task?.name ?? 'Loading task…'}</h2></div><button onClick={onClose} className="icon-button shrink-0" aria-label="Close details"><X className="h-5 w-5" /></button></header>
    {loading && <div className="p-5 text-sm text-slate-500">Loading task…</div>}{error && <p className="m-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {task && <div className="flex min-h-0 flex-1 flex-col overflow-y-auto"><section className="space-y-4 px-5 py-4"><div className="flex flex-wrap items-center gap-2"><PriorityBadge priority={task.priority} /><StatusBadge status={task.status} /><span className="ml-auto flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays className="h-3.5 w-3.5" />{formatDate(task.due_date)}</span></div><p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{task.description || 'No description provided.'}</p>
      <div className="flex flex-wrap gap-2">{task.attachments?.map((attachment) => <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="group relative h-16 w-16 overflow-hidden rounded-lg border bg-slate-50"><img src={attachment.url} alt="Task attachment" className="h-full w-full object-cover" /><span className="absolute inset-0 grid place-items-center bg-slate-900/40 text-white opacity-0 transition group-hover:opacity-100"><ImageIcon className="h-4 w-4" /></span></a>)}</div>
      <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2"><label className="sr-only" htmlFor="task-status">Task status</label><select id="task-status" className="field-input !w-auto !py-1.5" value={task.status} onChange={(event) => updateStatus(event.target.value)}><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select>{user.is_staff && <><Button variant="secondary" className="!px-2.5 !py-1.5" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" />Edit</Button><button onClick={remove} className="icon-button ml-auto text-rose-500 hover:bg-rose-50 hover:text-rose-700" title="Delete task"><Trash2 className="h-4 w-4" /></button></>}</div>
    </section><nav className="flex border-y px-5"><button onClick={() => setTab('discussion')} className={`border-b-2 px-3 py-3 text-sm font-semibold ${tab === 'discussion' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>Discussion</button><button onClick={() => setTab('activity')} className={`border-b-2 px-3 py-3 text-sm font-semibold ${tab === 'activity' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>History</button></nav>
    <section className="px-5 pb-5">{tab === 'discussion' ? <CommentThread task={task} onCommentAdded={load} /> : <div className="divide-y">{task.activities?.length ? task.activities.map((activity) => <div key={activity.id} className="flex gap-2.5 py-3"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><p className="text-sm text-slate-600"><strong className="text-slate-800">{activity.actor.full_name}</strong> {activity.detail.toLowerCase()}<span className="mt-0.5 block text-xs text-slate-400">{formatDateTime(activity.created_at)}</span></p></div>) : <p className="py-8 text-center text-sm text-slate-400">No history yet.</p>}</div>}</section></div>}
  </aside>{editing && <TaskForm task={task} onClose={() => setEditing(false)} onSaved={(updated) => { setTask((current) => ({ ...current, ...updated })); onTaskChanged() }} />}</>
}
