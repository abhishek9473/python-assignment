import { ClipboardList } from 'lucide-react'
import { useAuth } from './context/AuthContext'
import LoginForm from './components/auth/LoginForm'
import AppShell from './components/layout/AppShell'
import TaskBoard from './components/board/TaskBoard'

function PageLoader() {
  return <div className="grid min-h-screen place-items-center"><ClipboardList className="h-9 w-9 animate-pulse text-indigo-600" /></div>
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <LoginForm />
  return <AppShell><TaskBoard user={user} /></AppShell>
}
