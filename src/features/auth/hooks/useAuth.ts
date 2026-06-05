'use client'

import { useEffect, useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/client'

type AuthStatus = 'idle' | 'authenticating' | 'error' | 'authenticated'

interface AuthState {
  user: User | null
  loading: boolean
  status: AuthStatus
  error: string | null
}

interface UseAuthReturn extends AuthState {
  /** Retorna null em caso de sucesso, ou a mensagem de erro. */
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    status: 'idle',
    error: null,
  })

  useEffect(() => {
    const supabase = createClient()

    // Busca o usuário atual ao montar
    supabase.auth.getUser().then(({ data: { user } }) => {
      setState((prev) => ({
        ...prev,
        user,
        loading: false,
        status: user ? 'authenticated' : 'idle',
      }))
    })

    // Escuta mudanças de estado de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null
      setState((prev) => ({
        ...prev,
        user,
        loading: false,
        status: user ? 'authenticated' : 'idle',
        error: null,
      }))
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    const supabase = createClient()
    setState((prev) => ({ ...prev, status: 'authenticating', error: null, loading: true }))

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: error.message,
        loading: false,
      }))
      return error.message
    }

    // onAuthStateChange cuida de atualizar o estado com o usuário autenticado
    return null
  }, [])

  const signOut = useCallback(async () => {
    const supabase = createClient()
    setState((prev) => ({ ...prev, loading: true }))
    await supabase.auth.signOut()
    setState({ user: null, loading: false, status: 'idle', error: null })
  }, [])

  return { ...state, signIn, signOut }
}
