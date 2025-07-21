/**
 * Authentication Action Factory
 * 
 * Standardized action creators for authentication state machines.
 * Provides consistent patterns for common authentication operations
 * while maintaining the existing createAsyncAction pattern.
 */

import { createAsyncAction } from "./stateMachineUtils";
import type {
  NostrAuthDependencies,
  EnhancedNostrAuthDependencies,
  BaseAuthDependencies,
  AccountCreationDependencies,
  FirebaseAuthDependencies,
  ProfileManagementDependencies,
  AuthActionResult,
  AuthResult,
  AccountCreationResult,
  FirebaseAuthResult,
  NostrAuthMethod,
  NostrCredentials,
  ProfileData,
} from "../machines/sharedTypes";

/**
 * Authentication Action Factory
 * 
 * Provides standardized action creators for common authentication patterns.
 * Each method returns a memoized async action that can be used directly in state machines.
 */
export class AuthActionFactory {
  
  /**
   * Create a standardized Nostr authentication action
   * 
   * @param dependencies - Nostr authentication dependencies
   * @param dispatch - State machine dispatch function
   * @param actionName - Name for the action (default: "authenticateNostr")
   * @returns Memoized async action for Nostr authentication
   */
  static createNostrAuth(
    dependencies: NostrAuthDependencies,
    dispatch: React.Dispatch<any>,
    actionName: string = "authenticateNostr"
  ) {
    return createAsyncAction(
      actionName,
      async (method: NostrAuthMethod, credentials: NostrCredentials): Promise<AuthResult> => {
        // Authenticate with chosen method using dependency
        const authResult = await dependencies.authenticate(method, credentials);
        
        // Extract pubkey from authentication result
        const pubkey = (authResult as any)?.pubkey || "";
        
        // Dispatch completion action with pubkey
        dispatch({ type: "AUTH_COMPLETED", pubkey });
        
        return {
          pubkey,
          authMethod: method,
          profile: (authResult as any)?.profile
        };
      },
      dispatch
    );
  }

  /**
   * Create an enhanced Nostr authentication action for complex flows
   * 
   * @param dependencies - Enhanced Nostr authentication dependencies  
   * @param dispatch - State machine dispatch function
   * @param actionName - Name for the action (default: "authenticateNostr")
   * @returns Memoized async action for enhanced Nostr authentication
   */
  static createEnhancedNostrAuth(
    dependencies: EnhancedNostrAuthDependencies,
    dispatch: React.Dispatch<any>,
    actionName: string = "authenticateNostr"
  ) {
    return createAsyncAction(
      actionName,
      async (method: NostrAuthMethod, credentials: NostrCredentials) => {
        // Authenticate and get structured account object
        const account = await dependencies.authenticateNostr(method, credentials);
        
        return { account, pubkey: account.pubkey };
      },
      dispatch
    );
  }

  /**
   * Create a login completion action
   * 
   * @param dependencies - Base authentication dependencies
   * @param dispatch - State machine dispatch function  
   * @param actionName - Name for the action (default: "completeLogin")
   * @returns Memoized async action for login completion
   */
  static createLoginCompletion(
    dependencies: BaseAuthDependencies,
    dispatch: React.Dispatch<any>,
    actionName: string = "completeLogin"
  ) {
    return createAsyncAction(
      actionName,
      async (login: import("@nostrify/react/login").NLoginType): Promise<AuthActionResult> => {
        // Add login to current user context
        dependencies.addLogin(login);
        
        // Dispatch completion
        dispatch({ type: "LOGIN_COMPLETED" });
        
        return { success: true };
      },
      dispatch
    );
  }

  /**
   * Create an account setup action with optional profile publishing
   * 
   * @param dependencies - Account creation dependencies
   * @param dispatch - State machine dispatch function
   * @param actionName - Name for the action (default: "setupAccount")
   * @returns Memoized async action for account setup
   */
  static createAccountSetup(
    dependencies: AccountCreationDependencies,
    dispatch: React.Dispatch<any>,
    actionName: string = "setupAccount"
  ) {
    return createAsyncAction(
      actionName,
      async (
        profileData: ProfileData | null,
        generatedName: string
      ): Promise<AuthActionResult> => {
        // Setup account with profile and wallet creation
        await dependencies.setupAccount(profileData, generatedName);
        
        return { success: true };
      },
      dispatch
    );
  }

  /**
   * Create an account creation action
   * 
   * @param dependencies - Account creation dependencies
   * @param dispatch - State machine dispatch function
   * @param actionName - Name for the action (default: "createAccount")
   * @returns Memoized async action for account creation
   */
  static createAccountCreation(
    dependencies: AccountCreationDependencies,
    dispatch: React.Dispatch<any>,
    actionName: string = "createAccount"
  ) {
    return createAsyncAction(
      actionName,
      async (): Promise<AccountCreationResult> => {
        // Create new account
        const result = await dependencies.createAccount();
        
        // Dispatch account created
        dispatch({
          type: "ACCOUNT_CREATED",
          login: result.login,
          generatedName: result.generatedName
        });
        
        return result;
      },
      dispatch
    );
  }

  /**
   * Create a Firebase authentication action
   * 
   * @param dependencies - Firebase authentication dependencies
   * @param dispatch - State machine dispatch function
   * @param actionName - Name for the action (default: "authenticateFirebase")
   * @returns Memoized async action for Firebase authentication
   */
  static createFirebaseAuth(
    dependencies: FirebaseAuthDependencies,
    dispatch: React.Dispatch<any>,
    actionName: string = "authenticateFirebase"
  ) {
    return createAsyncAction(
      actionName,
      async (email: string, password: string): Promise<FirebaseAuthResult> => {
        // Authenticate with Firebase
        const firebaseUser = await dependencies.firebaseAuth(email, password);
        
        // Dispatch Firebase auth completion
        dispatch({ type: "FIREBASE_AUTH_COMPLETED", firebaseUser });
        
        return { firebaseUser };
      },
      dispatch
    );
  }

  /**
   * Create a profile completion action
   * 
   * @param dependencies - Profile management dependencies
   * @param dispatch - State machine dispatch function
   * @param actionName - Name for the action (default: "completeProfile")
   * @returns Memoized async action for profile completion
   */
  static createProfileCompletion(
    dependencies: ProfileManagementDependencies,
    dispatch: React.Dispatch<any>,
    actionName: string = "completeProfile"
  ) {
    return createAsyncAction(
      actionName,
      async (profileData: ProfileData): Promise<AuthActionResult> => {
        // Save profile data
        await dependencies.saveProfile(profileData);
        
        // Dispatch profile completion
        dispatch({ type: "PROFILE_COMPLETED", profileData });
        
        return { success: true, data: profileData };
      },
      dispatch
    );
  }

  /**
   * Create a profile sync action
   * 
   * @param dependencies - Profile management dependencies  
   * @param dispatch - State machine dispatch function
   * @param actionName - Name for the action (default: "syncProfile")
   * @returns Memoized async action for profile synchronization
   */
  static createProfileSync(
    dependencies: Pick<ProfileManagementDependencies, 'syncProfile'>,
    dispatch: React.Dispatch<any>,
    actionName: string = "syncProfile"
  ) {
    if (!dependencies.syncProfile) {
      throw new Error("syncProfile dependency is required for profile sync action");
    }

    return createAsyncAction(
      actionName,
      async (): Promise<AuthActionResult> => {
        // Sync profile from Nostr relays
        await dependencies.syncProfile!();
        
        return { success: true };
      },
      dispatch
    );
  }
}

/**
 * Utility function to create a complete authentication flow action
 * 
 * Combines authentication + login completion in a single action.
 * Useful for simple flows that don't need intermediate steps.
 * 
 * @param authDeps - Authentication dependencies
 * @param baseDeps - Base authentication dependencies  
 * @param dispatch - State machine dispatch function
 * @param actionName - Name for the action (default: "authenticateAndLogin")
 * @returns Memoized async action for complete auth flow
 */
export function createAuthAndLoginAction(
  authDeps: NostrAuthDependencies,
  baseDeps: BaseAuthDependencies,
  dispatch: React.Dispatch<any>,
  actionName: string = "authenticateAndLogin"
) {
  return createAsyncAction(
    actionName,
    async (method: NostrAuthMethod, credentials: NostrCredentials): Promise<AuthResult> => {
      // Step 1: Authenticate
      const authResult = await authDeps.authenticate(method, credentials);
      const login = authResult as import("@nostrify/react/login").NLoginType;
      
      // Step 2: Add login
      baseDeps.addLogin(login);
      
      // Step 3: Extract result data
      const pubkey = (authResult as any)?.pubkey || "";
      
      // Step 4: Dispatch completion
      dispatch({ type: "AUTH_COMPLETED", pubkey });
      
      return {
        pubkey,
        authMethod: method,
        profile: (authResult as any)?.profile
      };
    },
    dispatch
  );
}

/**
 * Type-safe action factory method selector
 * 
 * Helps TypeScript users select the appropriate factory method
 * based on their state machine's dependency requirements.
 */
export type ActionFactoryMethods = {
  nostrAuth: typeof AuthActionFactory.createNostrAuth;
  enhancedNostrAuth: typeof AuthActionFactory.createEnhancedNostrAuth;
  loginCompletion: typeof AuthActionFactory.createLoginCompletion;
  accountSetup: typeof AuthActionFactory.createAccountSetup;
  accountCreation: typeof AuthActionFactory.createAccountCreation;
  firebaseAuth: typeof AuthActionFactory.createFirebaseAuth;
  profileCompletion: typeof AuthActionFactory.createProfileCompletion;
  profileSync: typeof AuthActionFactory.createProfileSync;
  authAndLogin: typeof createAuthAndLoginAction;
};