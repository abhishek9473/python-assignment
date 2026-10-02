import { createContext, useContext, useEffect, useState } from 'react'
import api, { clearTokens, readTokens, storeTokens } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!readTokens()?.access) {
      setLoading(false)
      return
    }
    api.get('/auth/me/')
      .then(({ data }) => setUser(data))
      .catch(() => clearTokens())
      .finally(() => setLoading(false))
  }, [])

  const signIn = async (username, password) => {
    const { data: tokens } = await api.post('/auth/token/', { username, password })
    storeTokens(tokens)
    const { data: profile } = await api.get('/auth/me/')
    setUser(profile)
  }

  const signOut = () => {
    clearTokens()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
