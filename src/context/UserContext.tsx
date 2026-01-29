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

function getInitials(email: string, displayName: string | null): string {
  if (displayName) {
    const parts = displayName.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return displayName.substring(0, 2).toUpperCase()
  }
  // Extract from email (e.g., "john.doe@company.com" -> "JD")
  const localPart = email.split('@')[0]
  const nameParts = localPart.split(/[._-]/)
  if (nameParts.length >= 2) {
    return (nameParts[0][0] + nameParts[1][0]).toUpperCase()
  }
  return localPart.substring(0, 2).toUpperCase()
}

function getDisplayName(email: string, forwardedUser: string | null): string | null {
  if (forwardedUser) {
    return forwardedUser
  }
  // Try to create a display name from email (e.g., "john.doe@company.com" -> "John Doe")
  const localPart = email.split('@')[0]
  const nameParts = localPart.split(/[._-]/)
  if (nameParts.length >= 2) {
    return nameParts
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ')
  }
  return null
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

      const displayName = getDisplayName(data.email, data.forwardedUser)
      const initials = getInitials(data.email, displayName)

      setUser({
        authenticated: data.authenticated,
        email: data.email,
        displayName,
        initials,
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
