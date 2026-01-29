import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { databricksConfig } from '../config'

interface User {
  authenticated: boolean
  email: string
  displayName: string | null
  initials: string
}

interface UserContextType {
  user: User | null
  loading: boolean
  error: string | null
  refetch: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

function getDisplayName(email: string): string | null {
  if (!email || email === 'unknown') return null

  // Extract display name from email (e.g., "ankit.yadav@databricks.com" -> "Ankit Yadav")
  const localPart = email.split('@')[0]
  const nameParts = localPart.split(/[._-]/)

  if (nameParts.length >= 2) {
    return nameParts
      .filter(part => part.length > 0)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ')
  }

  // Single name - just capitalize it
  if (localPart.length > 0) {
    return localPart.charAt(0).toUpperCase() + localPart.slice(1).toLowerCase()
  }

  return null
}

function getInitials(email: string): string {
  if (!email || email === 'unknown') return '??'

  // Extract initials from email (e.g., "ankit.yadav@databricks.com" -> "AY")
  const localPart = email.split('@')[0]
  const nameParts = localPart.split(/[._-]/).filter(part => part.length > 0)

  if (nameParts.length >= 2) {
    return (nameParts[0][0] + nameParts[1][0]).toUpperCase()
  }

  // Single name - take first two characters
  if (localPart.length >= 2) {
    return localPart.substring(0, 2).toUpperCase()
  }

  return localPart.toUpperCase() || '??'
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUser = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${databricksConfig.api.baseUrl}/user`)

      if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.status}`)
      }

      const data = await response.json()

      setUser({
        authenticated: data.authenticated,
        email: data.email,
        displayName: getDisplayName(data.email),
        initials: getInitials(data.email),
      })
    } catch (err) {
      console.error('Failed to fetch user:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch user')
      // Set a default user for local development
      setUser({
        authenticated: false,
        email: 'unknown',
        displayName: null,
        initials: '??',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  return (
    <UserContext.Provider value={{ user, loading, error, refetch: fetchUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
