import React, { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

// Simplified test provider that doesn't rely on complex auth setup
export interface SimpleTestProviderProps {
  children: ReactNode
  queryClient?: QueryClient
  initialRoute?: string
}

export function SimpleTestProvider({
  children,
  queryClient,
  initialRoute = '/',
}: SimpleTestProviderProps) {
  // Create a fresh query client for each test if not provided
  const testQueryClient = queryClient || new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <QueryClientProvider client={testQueryClient}>
        {children}
      </QueryClientProvider>
    </MemoryRouter>
  )
}