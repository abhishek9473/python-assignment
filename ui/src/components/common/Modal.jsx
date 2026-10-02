import { X } from 'lucide-react'

export default function Modal({ title, children, onClose, wide = false }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4" role="dialog" aria-modal="true" aria-label={title}>
    <div className={`max-h-[90vh] w-full overflow-y-auto rounded-xl bg-white shadow-2xl ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4"><h2 className="text-lg font-bold text-slate-900">{title}</h2><button className="icon-button" aria-label="Close" onClick={onClose}><X className="h-5 w-5" /></button></div>
      {children}
    </div>
  </div>
}
