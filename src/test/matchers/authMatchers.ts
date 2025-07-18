import { expect } from 'vitest'
import type { NUser } from '@nostrify/react/login'
import { validateNsec, validateBunkerUri, validatePubkey } from '@/components/auth/utils/validation'

// Extend Vitest's expect with custom matchers
interface CustomMatchers<R = unknown> {
  toBeAuthenticated(): R
  toHaveValidNsec(): R
  toHaveValidBunkerUri(): R
  toHaveValidPubkey(): R
  toBeInAuthStep(step: string): R
  toHaveAuthError(operation?: string): R
  toBeLoading(operation?: string): R
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

expect.extend({
  toBeAuthenticated(received: any) {
    const { isNot } = this
    const pass = !!(received && received.pubkey && received.signer)

    return {
      pass,
      message: () =>
        isNot
          ? `Expected user not to be authenticated, but received: ${JSON.stringify(received)}`
          : `Expected user to be authenticated (have pubkey and signer), but received: ${JSON.stringify(received)}`,
    }
  },

  toHaveValidNsec(received: string) {
    const { isNot } = this
    const validation = validateNsec(received)
    const pass = validation.isValid

    return {
      pass,
      message: () =>
        isNot
          ? `Expected "${received}" not to be a valid nsec`
          : `Expected "${received}" to be a valid nsec, but got: ${validation.message}`,
    }
  },

  toHaveValidBunkerUri(received: string) {
    const { isNot } = this
    const validation = validateBunkerUri(received)
    const pass = validation.isValid

    return {
      pass,
      message: () =>
        isNot
          ? `Expected "${received}" not to be a valid bunker URI`
          : `Expected "${received}" to be a valid bunker URI, but got: ${validation.message}`,
    }
  },

  toHaveValidPubkey(received: string) {
    const { isNot } = this
    const validation = validatePubkey(received)
    const pass = validation.isValid

    return {
      pass,
      message: () =>
        isNot
          ? `Expected "${received}" not to be a valid pubkey`
          : `Expected "${received}" to be a valid pubkey, but got: ${validation.message}`,
    }
  },

  toBeInAuthStep(received: any, step: string) {
    const { isNot } = this
    const currentStep = received?.step || received?.stateMachine?.step
    const pass = currentStep === step

    return {
      pass,
      message: () =>
        isNot
          ? `Expected auth flow not to be in step "${step}", but it was`
          : `Expected auth flow to be in step "${step}", but was in "${currentStep}"`,
    }
  },

  toHaveAuthError(received: any, operation?: string) {
    const { isNot } = this
    let error = null

    if (operation) {
      // Check for operation-specific error
      error = received?.getError?.(operation) || received?.errors?.[operation]
    } else {
      // Check for any error
      error = received?.error || 
              (received?.errors && Object.values(received.errors).some(e => e)) ||
              (received?.getError && received.getError('general'))
    }

    const pass = !!error

    return {
      pass,
      message: () => {
        const operationText = operation ? ` for operation "${operation}"` : ''
        return isNot
          ? `Expected no auth error${operationText}, but got: ${error}`
          : `Expected auth error${operationText}, but got none`
      },
    }
  },

  toBeLoading(received: any, operation?: string) {
    const { isNot } = this
    let isLoading = false

    if (operation) {
      // Check for operation-specific loading
      isLoading = received?.isLoading?.(operation) || received?.isLoading?.[operation]
    } else {
      // Check for any loading state
      isLoading = received?.loading ||
                  received?.isLoading ||
                  (received?.isLoading && Object.values(received.isLoading).some(Boolean))
    }

    const pass = !!isLoading

    return {
      pass,
      message: () => {
        const operationText = operation ? ` for operation "${operation}"` : ''
        return isNot
          ? `Expected not to be loading${operationText}, but it was`
          : `Expected to be loading${operationText}, but it wasn't`
      },
    }
  },
})