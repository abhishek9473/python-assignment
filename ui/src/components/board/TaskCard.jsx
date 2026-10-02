import { CalendarDays, GripVertical, Image as ImageIcon, MessageSquare } from 'lucide-react'
import { Draggable } from '@hello-pangea/dnd'
import { PriorityBadge } from '../common/Badge'
import { formatDate } from '../../lib/utils'

export default function TaskCard({ task, index, isAdmin, onOpen }) {
  return <Draggable draggableId={String(task.id)} index={index}>
    {(provided, snapshot) => <article ref={provided.innerRef} {...provided.draggableProps} className={`group rounded-xl border bg-white p-3 shadow-card transition ${snapshot.isDragging ? 'rotate-1 border-indigo-300 shadow-lg' : 'hover:border-slate-300'}`}>
      <div className="mb-2 flex items-start gap-1"><button {...provided.dragHandleProps} className="mt-0.5 cursor-grab rounded p-0.5 text-slate-300 hover:text-slate-500 active:cursor-grabbing" aria-label={`Move ${task.name}`}><GripVertical className="h-4 w-4" /></button><button onClick={() => onOpen(task.id)} className="min-w-0 flex-1 text-left"><p className="truncate text-[11px] font-bold tracking-wide text-indigo-600">{task.code}</p><h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-5 text-slate-800">{task.name}</h3></button></div>
      {task.description && <p className="mb-3 line-clamp-2 text-xs leading-5 text-slate-500">{task.description}</p>}
      <div className="flex items-center justify-between gap-2"><PriorityBadge priority={task.priority} /><div className="flex items-center gap-2 text-xs text-slate-400">{task.attachments?.length > 0 && <span title="Has image attachments" className="inline-flex items-center gap-0.5"><ImageIcon className="h-3.5 w-3.5" />{task.attachments.length}</span>}{task.comment_count > 0 && <span className="inline-flex items-center gap-0.5"><MessageSquare className="h-3.5 w-3.5" />{task.comment_count}</span>}</div></div>
      <div className="mt-3 flex items-center gap-1.5 border-t pt-2.5 text-xs text-slate-500"><CalendarDays className="h-3.5 w-3.5" /><span className={task.due_date && new Date(`${task.due_date}T23:59:59`) < new Date() && task.status !== 'completed' ? 'font-medium text-rose-600' : ''}>{formatDate(task.due_date, { month: 'short', day: 'numeric' })}</span></div>
      {!isAdmin && <p className="mt-2 text-[10px] text-slate-400">Drag across columns to update status</p>}
    </article>}
  </Draggable>
}
