import { Droppable } from '@hello-pangea/dnd'
import TaskCard from './TaskCard'
import { STATUS } from '../../lib/utils'

export default function BoardColumn({ status, tasks, isAdmin, onOpen }) {
  const config = STATUS[status]
  return <section className="flex min-h-[32rem] min-w-[280px] flex-1 flex-col rounded-xl border border-slate-200 bg-slate-200/55 p-2.5"><header className="mb-2.5 flex items-center justify-between px-1"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-700"><i className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />{config.label}</h2><span className="rounded-md bg-white px-2 py-0.5 text-xs font-bold text-slate-500">{tasks.length}</span></header>
    <Droppable droppableId={status}>{(provided, snapshot) => <div ref={provided.innerRef} {...provided.droppableProps} className={`flex min-h-32 flex-1 flex-col gap-2.5 rounded-lg transition ${snapshot.isDraggingOver ? 'bg-indigo-50/80' : ''}`}>
      {tasks.map((task, index) => <TaskCard key={task.id} task={task} index={index} isAdmin={isAdmin} onOpen={onOpen} />)}
      {provided.placeholder}
      {!tasks.length && !snapshot.isDraggingOver && <p className="px-2 py-8 text-center text-xs text-slate-400">No tasks here</p>}
    </div>}</Droppable>
  </section>
}
