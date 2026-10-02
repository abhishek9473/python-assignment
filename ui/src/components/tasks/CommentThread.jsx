import { useState } from 'react'
import { CornerDownRight, FileText, Image as ImageIcon, Paperclip, Send, X } from 'lucide-react'
import api from '../../lib/api'
import { errorMessage, formatDateTime, initials } from '../../lib/utils'
import Button from '../common/Button'

function AttachmentLink({ attachment }) {
  const image = attachment.filename?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
  return <a href={attachment.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200">{image ? <ImageIcon className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}{attachment.filename}</a>
}

function CommentItem({ comment, depth = 0, onReply }) {
  return <div className={depth ? 'ml-5 border-l-2 border-slate-100 pl-3' : ''}><article className="py-3"><div className="flex gap-2.5"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">{initials(comment.author.full_name)}</span><div className="min-w-0 flex-1"><div className="flex items-baseline gap-2"><span className="text-sm font-semibold text-slate-700">{comment.author.full_name}</span><time className="text-xs text-slate-400">{formatDateTime(comment.created_at)}</time></div><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{comment.body}</p>{comment.attachments?.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{comment.attachments.map((item) => <AttachmentLink key={item.id} attachment={item} />)}</div>}<button onClick={() => onReply(comment)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"><CornerDownRight className="h-3.5 w-3.5" />Reply</button></div></div></article>{comment.replies?.map((reply) => <CommentItem key={reply.id} comment={reply} depth={depth + 1} onReply={onReply} />)}</div>
}

export default function CommentThread({ task, onCommentAdded }) {
  const [body, setBody] = useState('')
  const [files, setFiles] = useState([])
  const [replyTo, setReplyTo] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    if (!body.trim()) return
    setError('')
    setSubmitting(true)
    const payload = new FormData()
    payload.append('body', body.trim())
    if (replyTo) payload.append('parent_id', replyTo.id)
    files.forEach((file) => payload.append('attachments', file))
    try { await api.post(`/tasks/${task.id}/comments/`, payload); setBody(''); setFiles([]); setReplyTo(null); onCommentAdded() } catch (err) { setError(errorMessage(err, 'Your comment could not be posted.')) } finally { setSubmitting(false) }
  }

  return <div><div className="divide-y">{task.comments?.length ? task.comments.map((comment) => <CommentItem key={comment.id} comment={comment} onReply={setReplyTo} />) : <p className="py-8 text-center text-sm text-slate-400">Start the conversation about this task.</p>}</div>
    <form onSubmit={submit} className="mt-3 rounded-xl border bg-slate-50 p-3"><div className="mb-2 flex items-center justify-between">{replyTo ? <span className="text-xs text-slate-500">Replying to <strong>{replyTo.author.full_name}</strong></span> : <span className="text-xs text-slate-500">Use <strong>@username</strong> to mention a teammate.</span>}{replyTo && <button type="button" onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>}</div><textarea className="field-input min-h-20 resize-y bg-white" placeholder="Write a comment…" value={body} onChange={(event) => setBody(event.target.value)} maxLength="5000" required />
      {files.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{files.map((file, index) => <span key={`${file.name}-${index}`} className="rounded bg-white px-2 py-1 text-xs text-slate-500">{file.name}</span>)}</div>}
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}<div className="mt-2 flex items-center justify-between"><label className="icon-button cursor-pointer" title="Attach an image or PDF"><Paperclip className="h-4 w-4" /><input className="sr-only" type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /></label><Button type="submit" disabled={submitting || !body.trim()} className="!px-3 !py-1.5">{submitting ? 'Sending…' : <><Send className="h-3.5 w-3.5" />Send</>}</Button></div>
    </form></div>
}
