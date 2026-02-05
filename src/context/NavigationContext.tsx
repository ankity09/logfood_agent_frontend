import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface NavigationState {
  selectedAccountId: string | null
  selectedUseCaseId: string | null
  referrer: string | null
}

interface NavigationContextType extends NavigationState {
  navigateToUseCases: (accountId?: string) => void
  navigateToMeetingNotes: (accountId?: string) => void
  navigateToAccount: (accountId: string) => void
  setSelectedAccountId: (accountId: string | null) => void
  setSelectedUseCaseId: (useCaseId: string | null) => void
  clearNavigation: () => void
}

const NavigationContext = createContext<NavigationContextType | null>(null)

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NavigationState>({
    selectedAccountId: null,
    selectedUseCaseId: null,
    referrer: null,
  })

  const setSelectedAccountId = useCallback((accountId: string | null) => {
    setState(prev => ({ ...prev, selectedAccountId: accountId }))
  }, [])

  const setSelectedUseCaseId = useCallback((useCaseId: string | null) => {
    setState(prev => ({ ...prev, selectedUseCaseId: useCaseId }))
  }, [])

  const navigateToUseCases = useCallback((accountId?: string) => {
    setState(prev => ({
      ...prev,
      selectedAccountId: accountId || null,
      referrer: 'accounts',
    }))
  }, [])

  const navigateToMeetingNotes = useCallback((accountId?: string) => {
    setState(prev => ({
      ...prev,
      selectedAccountId: accountId || null,
      referrer: 'accounts',
    }))
  }, [])

  const navigateToAccount = useCallback((accountId: string) => {
    setState(prev => ({
      ...prev,
      selectedAccountId: accountId,
      referrer: null,
    }))
  }, [])

  const clearNavigation = useCallback(() => {
    setState({
      selectedAccountId: null,
      selectedUseCaseId: null,
      referrer: null,
    })
  }, [])

  return (
    <NavigationContext.Provider
      value={{
        ...state,
        navigateToUseCases,
        navigateToMeetingNotes,
        navigateToAccount,
        setSelectedAccountId,
        setSelectedUseCaseId,
        clearNavigation,
      }}
    >
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}
