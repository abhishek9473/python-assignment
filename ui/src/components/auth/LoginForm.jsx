import { useState } from 'react'
import { ArrowRight, ClipboardList, LockKeyhole, UserRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { errorMessage } from '../../lib/utils'
import Button from '../common/Button'

export default function LoginForm() {
  const { signIn } = useAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try { await signIn(form.username, form.password) } catch (err) { setError(errorMessage(err, 'Sign-in failed. Check your username and password.')) } finally { setSubmitting(false) }
  }

  return <main className="grid min-h-screen place-items-center bg-slate-950 p-5">
    <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl shadow-indigo-950/40">
      <div className="mb-8"><div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-indigo-600 text-white"><ClipboardList className="h-6 w-6" /></div><h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome to Flowboard</h1><p className="mt-2 text-sm text-slate-500">Sign in to manage your team’s work.</p></div>
      <form className="space-y-5" onSubmit={submit}>
        <label><span className="field-label">Username</span><div className="relative"><UserRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className="field-input pl-9" autoComplete="username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required /></div></label>
        <label><span className="field-label">Password</span><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className="field-input pl-9" type="password" autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></div></label>
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>{submitting ? 'Signing in…' : <>Sign in <ArrowRight className="h-4 w-4" /></>}</Button>
      </form>
    </section>
  </main>
}
