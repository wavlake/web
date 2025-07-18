/**
 * Legacy Migration State Machine
 *
 * Manages the complex state for legacy account migration including
 * Firebase auth, pubkey checking, and account linking/generation.
 */

import { useReducer, useCallback, useMemo } from "react";
import {
  createAsyncAction,
  handleBaseActions,
  isOperationLoading,
  getOperationError,
} from "../utils/stateMachineUtils";
import {
  ActionResult,
  LegacyMigrationState,
  LegacyMigrationAction,
  LegacyMigrationStep,
  LinkedPubkey,
  NostrAccount,
} from "./types";
import { NostrAuthMethod, NostrCredentials } from "@/types/authFlow";
import { User as FirebaseUser } from "firebase/auth";
import { type ProfileData } from "@/types/profile";
import { makeLinkedPubkeysRequest } from "@/hooks/useLinkedPubkeys";
import { makeLinkAccountRequest } from "../useLinkAccount";

const initialState: LegacyMigrationState = {
  step: "firebase-auth",
  firebaseUser: null,
  linkedPubkeys: [],
  expectedPubkey: null,
  actualPubkey: null,
  mismatchedAccount: null,
  generatedAccount: null,
  createdLogin: null,
  generatedName: null,
  profileData: null,
  isLoading: {},
  errors: {},
  canGoBack: false,
};

function legacyMigrationReducer(
  state: LegacyMigrationState,
  action: LegacyMigrationAction
): LegacyMigrationState {
  console.log(`🔄 [LegacyMigration] Reducer called:`, {
    currentStep: state.step,
    actionType: action.type,
    actionPayload: action,
    timestamp: new Date().toISOString(),
  });

  // Handle base async actions first
  const baseResult = handleBaseActions(state, action);
  if (baseResult) {
    console.log(`✅ [LegacyMigration] Base action handled:`, {
      actionType: action.type,
      newState: baseResult,
      timestamp: new Date().toISOString(),
    });
    return baseResult as LegacyMigrationState;
  }

  switch (action.type) {
    case "FIREBASE_AUTH_COMPLETED": {
      const newState = {
        ...state,
        firebaseUser: action.firebaseUser,
        step: "checking-links" as const,
        canGoBack: true,
      };
      console.log(`🔐 [LegacyMigration] Firebase auth completed:`, {
        firebaseUser: action.firebaseUser?.email,
        nextStep: newState.step,
        timestamp: new Date().toISOString(),
      });
      return newState;
    }

    case "LINKS_CHECKED": {
      const nextStep = action.linkedPubkeys.length > 0 ? "linked-nostr-auth" : "account-choice";
      const newState = {
        ...state,
        linkedPubkeys: action.linkedPubkeys,
        step: nextStep,
        expectedPubkey: action.linkedPubkeys.length > 0 ? action.linkedPubkeys[0].pubkey : null,
        canGoBack: true,
      };
      console.log(`🔗 [LegacyMigration] Links checked:`, {
        linkedPubkeysCount: action.linkedPubkeys.length,
        linkedPubkeys: action.linkedPubkeys,
        expectedPubkey: newState.expectedPubkey,
        nextStep: newState.step,
        timestamp: new Date().toISOString(),
      });
      return newState;
    }

    case "ACCOUNT_CHOICE_MADE": {
      const nextStep = action.choice === "generate" ? "account-generation" : "bring-own-keypair";
      const newState = {
        ...state,
        step: nextStep,
        canGoBack: true,
      };
      console.log(`🎯 [LegacyMigration] Account choice made:`, {
        choice: action.choice,
        nextStep: newState.step,
        timestamp: new Date().toISOString(),
      });
      return newState;
    }

    case "ACCOUNT_GENERATED": {
      const newState = {
        ...state,
        generatedAccount: action.account,
        step: "profile-setup" as const,
        canGoBack: true,
      };
      console.log(`🆔 [LegacyMigration] Account generated:`, {
        accountPubkey: action.account.pubkey,
        nextStep: newState.step,
        timestamp: new Date().toISOString(),
      });
      return newState;
    }

    case "KEYPAIR_AUTHENTICATED": {
      const newState = {
        ...state,
        generatedAccount: action.account,
        step: "profile-setup" as const,
        canGoBack: true,
      };
      console.log(`🔑 [LegacyMigration] Keypair authenticated:`, {
        accountPubkey: action.account.pubkey,
        nextStep: newState.step,
        timestamp: new Date().toISOString(),
      });
      return newState;
    }

    case "ACCOUNT_CREATED": {
      const newState = {
        ...state,
        createdLogin: action.login,
        generatedName: action.generatedName || null,
      };
      console.log(`✨ [LegacyMigration] Account created:`, {
        loginType: action.login.type,
        loginPubkey: action.login.pubkey,
        generatedName: action.generatedName,
        currentStep: newState.step,
        timestamp: new Date().toISOString(),
      });
      return newState;
    }

    case "PROFILE_COMPLETED": {
      const newState = {
        ...state,
        profileData: action.profileData,
        step: "complete" as const,
        canGoBack: false,
      };
      console.log(`👤 [LegacyMigration] Profile completed, going to complete:`, {
        profileData: action.profileData,
        nextStep: newState.step,
        timestamp: new Date().toISOString(),
      });
      return newState;
    }

    case "PUBKEY_MISMATCH_DETECTED": {
      const newState = {
        ...state,
        step: "pubkey-mismatch" as const,
        actualPubkey: action.actualPubkey,
        mismatchedAccount: action.account,
        canGoBack: true,
      };
      console.log(`⚠️ [LegacyMigration] Pubkey mismatch detected:`, {
        expectedPubkey: state.expectedPubkey,
        actualPubkey: action.actualPubkey,
        nextStep: newState.step,
        timestamp: new Date().toISOString(),
      });
      return newState;
    }

    case "PUBKEY_MISMATCH_RETRY": {
      const newState = {
        ...state,
        step: "linked-nostr-auth" as const,
        actualPubkey: null,
        mismatchedAccount: null,
        canGoBack: true,
      };
      console.log(`🔄 [LegacyMigration] Pubkey mismatch retry:`, {
        nextStep: newState.step,
        timestamp: new Date().toISOString(),
      });
      return newState;
    }

    case "PUBKEY_MISMATCH_CONTINUE": {
      const newState = {
        ...state,
        actualPubkey: null,
        mismatchedAccount: null,
        canGoBack: false,
      };
      console.log(`➡️ [LegacyMigration] Pubkey mismatch continue:`, {
        currentStep: newState.step,
        timestamp: new Date().toISOString(),
      });
      return newState;
    }

    case "LINKING_COMPLETED": {
      const newState = {
        ...state,
        step: "complete" as const,
        canGoBack: false,
      };
      console.log(`🔗 [LegacyMigration] Linking completed:`, {
        nextStep: newState.step,
        timestamp: new Date().toISOString(),
      });
      return newState;
    }

    case "LOGIN_COMPLETED": {
      const newState = {
        ...state,
        step: "complete" as const,
        canGoBack: false,
      };
      console.log(`🎉 [LegacyMigration] Login completed:`, {
        nextStep: newState.step,
        timestamp: new Date().toISOString(),
      });
      return newState;
    }

    case "GO_BACK": {
      const previousStep = getPreviousStep(
        state.step,
        state.linkedPubkeys.length > 0
      );
      const newState = {
        ...state,
        step: previousStep,
        canGoBack: previousStep !== "firebase-auth",
      };
      console.log(`⬅️ [LegacyMigration] Going back:`, {
        fromStep: state.step,
        toStep: previousStep,
        canGoBack: newState.canGoBack,
        timestamp: new Date().toISOString(),
      });
      return newState;
    }

    case "RESET": {
      console.log(`🔄 [LegacyMigration] State reset:`, {
        fromStep: state.step,
        timestamp: new Date().toISOString(),
      });
      return initialState;
    }

    default:
      console.log(`❓ [LegacyMigration] Unknown action:`, {
        actionType: action.type,
        currentStep: state.step,
        timestamp: new Date().toISOString(),
      });
      return state;
  }
}

function getPreviousStep(
  currentStep: LegacyMigrationStep,
  hasLinkedAccounts: boolean
): LegacyMigrationStep {
  switch (currentStep) {
    case "checking-links":
      return "firebase-auth";
    case "linked-nostr-auth":
      return "firebase-auth"; // Skip checking-links since it's already done
    case "pubkey-mismatch":
      return "linked-nostr-auth"; // Go back to retry authentication
    case "account-choice":
      return "firebase-auth"; // Skip checking-links since it's already done
    case "account-generation":
    case "bring-own-keypair":
      return hasLinkedAccounts ? "linked-nostr-auth" : "account-choice";
    case "profile-setup":
      return "account-generation"; // Could be from account-generation or bring-own-keypair
    case "linking":
      // This step should no longer be reached due to atomic linking
      return "profile-setup";
    default:
      return "firebase-auth";
  }
}

// Hook interface
export interface UseLegacyMigrationStateMachineResult {
  // State
  step: LegacyMigrationStep;
  firebaseUser: FirebaseUser | null;
  linkedPubkeys: LinkedPubkey[];
  expectedPubkey: string | null;
  actualPubkey: string | null;
  mismatchedAccount: NostrAccount | null;
  generatedAccount: NostrAccount | null;
  createdLogin: import("@nostrify/react/login").NLoginType | null;
  generatedName: string | null;
  profileData: ProfileData | null;
  canGoBack: boolean;

  // Loading helpers
  isLoading: (operation: string) => boolean;
  getError: (operation: string) => Error | null;

  // Promise-based actions
  actions: {
    authenticateWithFirebase: (
      email: string,
      password: string
    ) => Promise<ActionResult>;
    authenticateWithLinkedNostr: (
      credentials: NostrCredentials
    ) => Promise<ActionResult>;
    retryLinkedNostrAuth: () => void;
    continueWithNewPubkey: () => Promise<ActionResult>;
    generateNewAccount: () => Promise<ActionResult>;
    bringOwnKeypair: (credentials: NostrCredentials) => Promise<ActionResult>;
    completeProfile: (profileData: ProfileData) => Promise<ActionResult>;
    completeLogin: () => Promise<ActionResult>;
  };

  // Navigation
  goBack: () => void;
  reset: () => void;
}

export interface LegacyMigrationStateMachineDependencies {
  firebaseAuth: (email: string, password: string) => Promise<FirebaseUser>;
  authenticateNostr: (
    method: NostrAuthMethod,
    credentials: NostrCredentials
  ) => Promise<NostrAccount>;
  createAccount: () => Promise<{
    login: import("@nostrify/react/login").NLoginType;
    generatedName: string;
  }>;
  addLogin: (login: import("@nostrify/react/login").NLoginType) => void;
  setupAccount: (
    profileData: ProfileData | null,
    generatedName: string
  ) => Promise<void>;
  nostr: any; // Nostr object for bunker connections
}

export function useLegacyMigrationStateMachine(
  dependencies: LegacyMigrationStateMachineDependencies
): UseLegacyMigrationStateMachineResult {
  const [state, dispatch] = useReducer(legacyMigrationReducer, initialState);

  // Create async action handlers
  const authenticateWithFirebase = useMemo(
    () =>
      createAsyncAction(
        "authenticateWithFirebase",
        async (email: string, password: string) => {
          console.log(`🚀 [LegacyMigration] Starting Firebase authentication:`, {
            email,
            timestamp: new Date().toISOString(),
          });

          // Firebase auth
          const firebaseUser = await dependencies.firebaseAuth(email, password);
          console.log(`✅ [LegacyMigration] Firebase authentication successful:`, {
            userEmail: firebaseUser.email,
            userId: firebaseUser.uid,
            timestamp: new Date().toISOString(),
          });
          dispatch({ type: "FIREBASE_AUTH_COMPLETED", firebaseUser });

          // Check for linked pubkeys using direct API call
          console.log(`🔍 [LegacyMigration] Getting Firebase token and checking linked pubkeys:`, {
            timestamp: new Date().toISOString(),
          });
          const firebaseToken = await firebaseUser.getIdToken();
          const linkedPubkeys = await makeLinkedPubkeysRequest(
            firebaseUser,
            firebaseToken
          );
          console.log(`🔗 [LegacyMigration] Linked pubkeys check completed:`, {
            linkedPubkeysCount: linkedPubkeys.length,
            linkedPubkeys: linkedPubkeys.map(p => ({ pubkey: p.pubkey.slice(0, 8) + '...', isMostRecentlyLinked: p.isMostRecentlyLinked })),
            timestamp: new Date().toISOString(),
          });
          dispatch({ type: "LINKS_CHECKED", linkedPubkeys });

          return { firebaseUser, linkedPubkeys };
        },
        dispatch
      ),
    [dependencies]
  );

  const authenticateWithLinkedNostr = useMemo(
    () =>
      createAsyncAction(
        "authenticateWithLinkedNostr",
        async (credentials: NostrCredentials) => {
          // Authenticate with the provided credentials
          const account = await dependencies.authenticateNostr(
            credentials.method,
            credentials
          );

          // Check if the authenticated pubkey matches the expected pubkey
          if (state.expectedPubkey && account.pubkey !== state.expectedPubkey) {
            // Pubkey mismatch detected - show mismatch dialog
            dispatch({
              type: "PUBKEY_MISMATCH_DETECTED",
              expectedPubkey: state.expectedPubkey,
              actualPubkey: account.pubkey,
              account,
            });
            return { account, mismatch: true };
          }

          // Pubkey matches - continue with authentication
          // Navigate to app (linking already exists)
          dispatch({ type: "LINKING_COMPLETED" });

          return { account, mismatch: false };
        },
        dispatch
      ),
    [dependencies, state.expectedPubkey]
  );

  // Handle retry from pubkey mismatch
  const retryLinkedNostrAuth = useCallback(() => {
    dispatch({ type: "PUBKEY_MISMATCH_RETRY" });
  }, []);

  // Handle continue with new pubkey (link it to Firebase)
  const continueWithNewPubkey = useMemo(
    () =>
      createAsyncAction(
        "continueWithNewPubkey",
        async () => {
          if (!state.mismatchedAccount || !state.firebaseUser) {
            throw new Error("No mismatched account or Firebase user available");
          }

          // Link the new pubkey to Firebase account
          const firebaseToken = await state.firebaseUser.getIdToken();
          
          // Create proper signer for NIP-98 authentication
          const nip98Signer = {
            signEvent: async (event: unknown) => {
              // For pubkey mismatch, the signer is the mismatched account's signer
              const signer = state.mismatchedAccount!.signer as any;
              return await signer.signEvent(event as any);
            },
            getPublicKey: async () => state.mismatchedAccount!.pubkey,
          };
          
          try {
            await makeLinkAccountRequest({
              pubkey: state.mismatchedAccount.pubkey,
              firebaseUid: state.firebaseUser.uid,
              authToken: firebaseToken,
              signer: nip98Signer,
            });
            
            console.log(`✅ [LegacyMigration] Pubkey mismatch account linked successfully:`, {
              timestamp: new Date().toISOString(),
            });
          } catch (error: any) {
            console.log(`❌ [LegacyMigration] Pubkey mismatch account linking failed:`, {
              error: error.message,
              errorStack: error.stack,
              timestamp: new Date().toISOString(),
            });
            
            // Provide user-friendly error messages
            if (error.message?.includes('network') || error.message?.includes('fetch')) {
              throw new Error("Network error during account linking. Please check your connection and try again.");
            } else if (error.message?.includes('auth') || error.message?.includes('token')) {
              throw new Error("Authentication error during account linking. Please try signing in again.");
            } else if (error.message?.includes('duplicate') || error.message?.includes('already')) {
              throw new Error("This Nostr account is already linked to a different Firebase account.");
            } else {
              throw new Error(`Failed to link new account: ${error.message || 'Unknown error'}. Please try again.`);
            }
          }

          // Clear mismatch state and complete the flow
          dispatch({ type: "PUBKEY_MISMATCH_CONTINUE" });
          dispatch({ type: "LINKING_COMPLETED" });

          return { account: state.mismatchedAccount };
        },
        dispatch
      ),
    [state.mismatchedAccount, state.firebaseUser]
  );

  const generateNewAccount = useMemo(
    () =>
      createAsyncAction(
        "generateNewAccount",
        async () => {
          console.log(`🆔 [LegacyMigration] Starting account generation:`, {
            currentStep: state.step,
            hasFirebaseUser: !!state.firebaseUser,
            firebaseUserEmail: state.firebaseUser?.email,
            timestamp: new Date().toISOString(),
          });

          // Create Nostr account but don't log in yet
          console.log(`⚙️ [LegacyMigration] Creating Nostr account:`, {
            timestamp: new Date().toISOString(),
          });
          const { login, generatedName } = await dependencies.createAccount();
          console.log(`✨ [LegacyMigration] Nostr account created:`, {
            loginType: login.type,
            loginPubkey: login.pubkey,
            generatedName,
            timestamp: new Date().toISOString(),
          });
          dispatch({ type: "ACCOUNT_CREATED", login, generatedName });

          // Convert login to NostrAccount for linking (no redundant account creation)
          const account: NostrAccount = {
            pubkey: login.pubkey,
            signer: login,
            profile: {
              name: generatedName,
            },
          };
          
          // Link to Firebase atomically using direct API call
          if (!state.firebaseUser) {
            console.log(`❌ [LegacyMigration] ERROR: Firebase user not available for linking:`, {
              timestamp: new Date().toISOString(),
            });
            throw new Error("Firebase user not available for linking");
          }

          console.log(`🔗 [LegacyMigration] Starting atomic Firebase linking:`, {
            accountPubkey: account.pubkey,
            firebaseUid: state.firebaseUser.uid,
            timestamp: new Date().toISOString(),
          });

          const firebaseToken = await state.firebaseUser.getIdToken();
          console.log(`🎫 [LegacyMigration] Firebase token obtained:`, {
            tokenLength: firebaseToken.length,
            timestamp: new Date().toISOString(),
          });
          
          // Create proper signer for NIP-98 authentication using direct signing
          console.log(`🔐 [LegacyMigration] Creating NIP-98 signer:`, {
            loginType: login.type,
            timestamp: new Date().toISOString(),
          });
          const nip98Signer = {
            signEvent: async (event: unknown) => {
              console.log(`✍️ [LegacyMigration] NIP-98 signer: signEvent called:`, {
                loginType: login.type,
                eventKind: (event as any)?.kind,
                timestamp: new Date().toISOString(),
              });

              // For newly generated accounts, we need to sign using the login's signing capability
              // First, ensure we have a user from the login to access the signer
              const { NUser } = await import("@nostrify/react/login");
              let user: any;
              
              switch (login.type) {
                case 'nsec':
                  console.log(`🔑 [LegacyMigration] Converting nsec login to NUser:`, {
                    timestamp: new Date().toISOString(),
                  });
                  user = NUser.fromNsecLogin(login);
                  break;
                case 'bunker':
                  console.log(`🏠 [LegacyMigration] Converting bunker login to NUser:`, {
                    timestamp: new Date().toISOString(),
                  });
                  user = NUser.fromBunkerLogin(login, dependencies.nostr);
                  break;
                case 'extension':
                  console.log(`🔌 [LegacyMigration] Converting extension login to NUser:`, {
                    timestamp: new Date().toISOString(),
                  });
                  user = NUser.fromExtensionLogin(login);
                  break;
                default:
                  console.log(`❌ [LegacyMigration] ERROR: Unsupported login type:`, {
                    loginType: login.type,
                    timestamp: new Date().toISOString(),
                  });
                  throw new Error(`Unsupported login type for NIP-98: ${login.type}`);
              }
              
              console.log(`📝 [LegacyMigration] Signing event with user signer:`, {
                userExists: !!user,
                signerExists: !!user?.signer,
                timestamp: new Date().toISOString(),
              });
              
              const signedEvent = await user.signer.signEvent(event as any);
              console.log(`✅ [LegacyMigration] Event signed successfully:`, {
                signedEventId: signedEvent?.id,
                timestamp: new Date().toISOString(),
              });
              
              return signedEvent;
            },
            getPublicKey: async () => {
              console.log(`🔍 [LegacyMigration] NIP-98 signer: getPublicKey called:`, {
                pubkey: login.pubkey.slice(0, 8) + '...',
                timestamp: new Date().toISOString(),
              });
              return login.pubkey;
            },
          };
          
          console.log(`📞 [LegacyMigration] Making link account request:`, {
            pubkey: account.pubkey.slice(0, 8) + '...',
            firebaseUid: state.firebaseUser.uid,
            timestamp: new Date().toISOString(),
          });

          try {
            await makeLinkAccountRequest({
              pubkey: account.pubkey,
              firebaseUid: state.firebaseUser.uid,
              authToken: firebaseToken,
              signer: nip98Signer,
            });
            console.log(`🔗 [LegacyMigration] Account linking successful:`, {
              timestamp: new Date().toISOString(),
            });
          } catch (error: any) {
            console.log(`❌ [LegacyMigration] Account linking failed:`, {
              error: error.message,
              errorStack: error.stack,
              timestamp: new Date().toISOString(),
            });
            
            // Provide more specific error messages based on error type
            if (error.message?.includes('network') || error.message?.includes('fetch')) {
              throw new Error("Network error during account linking. Please check your connection and try again.");
            } else if (error.message?.includes('auth') || error.message?.includes('token')) {
              throw new Error("Authentication error during account linking. Please try signing in again.");
            } else if (error.message?.includes('duplicate') || error.message?.includes('already')) {
              throw new Error("This account is already linked. Please try a different authentication method.");
            } else {
              throw new Error(`Account linking failed: ${error.message || 'Unknown error'}. Please try again.`);
            }
          }

          // Store the account for profile setup step
          console.log(`📝 [LegacyMigration] Proceeding to profile setup:`, {
            accountPubkey: account.pubkey,
            generatedName,
            timestamp: new Date().toISOString(),
          });

          // Go to profile-setup step instead of skipping it
          dispatch({ type: "ACCOUNT_GENERATED", account });

          return { login, generatedName, account };
        },
        dispatch
      ),
    [dependencies, state.firebaseUser]
  );

  const bringOwnKeypair = useMemo(
    () =>
      createAsyncAction(
        "bringOwnKeypair",
        async (credentials: NostrCredentials) => {
          // Authenticate with provided keys
          const account = await dependencies.authenticateNostr(
            credentials.method,
            credentials
          );
          
          // Link to Firebase atomically using direct API call
          if (!state.firebaseUser) {
            throw new Error("Firebase user not available for linking");
          }
          const firebaseToken = await state.firebaseUser.getIdToken();
          
          // Create proper signer for NIP-98 authentication
          const nip98Signer = {
            signEvent: async (event: unknown) => {
              // For bring-own-keypair, the signer is the account's signer
              const signer = account.signer as any;
              return await signer.signEvent(event as any);
            },
            getPublicKey: async () => account.pubkey,
          };
          
          try {
            await makeLinkAccountRequest({
              pubkey: account.pubkey,
              firebaseUid: state.firebaseUser.uid,
              authToken: firebaseToken,
              signer: nip98Signer,
            });
            
            console.log(`✅ [LegacyMigration] Bring-own-keypair account linked successfully:`, {
              timestamp: new Date().toISOString(),
            });
          } catch (error: any) {
            console.log(`❌ [LegacyMigration] Bring-own-keypair account linking failed:`, {
              error: error.message,
              errorStack: error.stack,
              timestamp: new Date().toISOString(),
            });
            
            // Provide user-friendly error messages
            if (error.message?.includes('network') || error.message?.includes('fetch')) {
              throw new Error("Network error during account linking. Please check your connection and try again.");
            } else if (error.message?.includes('auth') || error.message?.includes('token')) {
              throw new Error("Authentication error during account linking. Please try signing in again.");
            } else if (error.message?.includes('duplicate') || error.message?.includes('already')) {
              throw new Error("This Nostr account is already linked to a different Firebase account.");
            } else {
              throw new Error(`Failed to link imported account: ${error.message || 'Unknown error'}. Please try again.`);
            }
          }

          // Create login from the authenticated account
          const login = account.signer as import("@nostrify/react/login").NLoginType;
          
          // Log the user in immediately
          dependencies.addLogin(login);

          // Setup account (create wallet, publish profile) - non-critical operations
          try {
            await dependencies.setupAccount(null, account.profile?.name || '');
            console.log(`✅ [LegacyMigration] Bring-own-keypair account setup completed:`, {
              timestamp: new Date().toISOString(),
            });
          } catch (error: any) {
            console.log(`⚠️ [LegacyMigration] Bring-own-keypair account setup failed (non-critical):`, {
              error: error.message,
              timestamp: new Date().toISOString(),
            });
            // Don't block the flow - user is already authenticated and linked
          }

          // Skip profile-setup and linking steps, go directly to complete
          dispatch({ type: "LOGIN_COMPLETED" });

          return { account };
        },
        dispatch
      ),
    [dependencies, state.firebaseUser]
  );

  const completeProfile = useMemo(
    () =>
      createAsyncAction(
        "completeProfile",
        async (profileData: ProfileData) => {
          console.log(`👤 [LegacyMigration] Starting profile completion:`, {
            profileData,
            hasCreatedLogin: !!state.createdLogin,
            hasGeneratedName: !!state.generatedName,
            timestamp: new Date().toISOString(),
          });

          if (!state.createdLogin || !state.generatedName) {
            throw new Error("No login or generated name available for profile completion");
          }

          // Store profile data first
          dispatch({ type: "PROFILE_COMPLETED", profileData });

          // Add the login to actually log the user in
          console.log(`👤 [LegacyMigration] Adding login to current user:`, {
            timestamp: new Date().toISOString(),
          });
          dependencies.addLogin(state.createdLogin);

          // Add a small delay to ensure user authentication state has propagated
          console.log(`⏳ [LegacyMigration] Waiting for user authentication to propagate:`, {
            timestamp: new Date().toISOString(),
          });
          await new Promise(resolve => setTimeout(resolve, 100));

          // Setup account (create wallet, publish profile with user's custom data)
          // These operations are non-critical - if they fail, user should still be logged in
          console.log(`⚙️ [LegacyMigration] Setting up account with custom profile:`, {
            profileData,
            generatedName: state.generatedName,
            timestamp: new Date().toISOString(),
          });
          
          try {
            await dependencies.setupAccount(profileData, state.generatedName);
            console.log(`✅ [LegacyMigration] Account setup completed successfully:`, {
              timestamp: new Date().toISOString(),
            });
          } catch (error: any) {
            console.log(`⚠️ [LegacyMigration] Account setup failed (non-critical):`, {
              error: error.message,
              errorStack: error.stack,
              timestamp: new Date().toISOString(),
            });
            
            // Log warning but don't block the flow - user is already authenticated
            console.log(`📝 [LegacyMigration] Continuing with basic profile setup due to setup error:`, {
              timestamp: new Date().toISOString(),
            });
            
            // Try to publish at least a basic profile manually if setupAccount failed
            try {
              console.log(`👤 [LegacyMigration] Attempting manual profile publishing:`, {
                timestamp: new Date().toISOString(),
              });
              
              // Use the nostr instance to publish a basic profile
              const basicProfile = profileData || { name: state.generatedName };
              const profileEvent = {
                kind: 0,
                content: JSON.stringify(basicProfile),
                tags: [],
                created_at: Math.floor(Date.now() / 1000),
              };
              
              await dependencies.nostr.event(profileEvent);
              console.log(`✅ [LegacyMigration] Basic profile published successfully:`, {
                timestamp: new Date().toISOString(),
              });
            } catch (profileError: any) {
              console.log(`⚠️ [LegacyMigration] Manual profile publishing also failed:`, {
                error: profileError.message,
                timestamp: new Date().toISOString(),
              });
              // Even this failure is non-critical - user can set up profile later
            }
          }
          
          console.log(`✅ [LegacyMigration] Profile completion finished:`, {
            timestamp: new Date().toISOString(),
          });

          return { profileData };
        },
        dispatch
      ),
    [dependencies, state.createdLogin, state.generatedName]
  );

  const completeLogin = useMemo(
    () =>
      createAsyncAction(
        "completeLogin",
        async () => {
          if (state.createdLogin && state.generatedName) {
            // Add the login to actually log the user in
            dependencies.addLogin(state.createdLogin);

            // Setup account (create wallet, publish profile)
            // Use the profile data from the profile setup step
            await dependencies.setupAccount(
              state.profileData,
              state.generatedName
            );

            dispatch({ type: "LOGIN_COMPLETED" });
            return { success: true };
          }
          throw new Error("No login or generated name available");
        },
        dispatch
      ),
    [dependencies, state.createdLogin, state.generatedName, state.profileData]
  );

  // Navigation helpers
  const goBack = useCallback(() => {
    if (state.canGoBack) {
      dispatch({ type: "GO_BACK" });
    }
  }, [state.canGoBack]);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  // Loading and error helpers
  const isLoading = useCallback(
    (operation: string) => isOperationLoading(state, operation),
    [state]
  );

  const getError = useCallback(
    (operation: string) => getOperationError(state, operation),
    [state]
  );

  return {
    // State
    step: state.step,
    firebaseUser: state.firebaseUser,
    linkedPubkeys: state.linkedPubkeys,
    expectedPubkey: state.expectedPubkey,
    actualPubkey: state.actualPubkey,
    mismatchedAccount: state.mismatchedAccount,
    generatedAccount: state.generatedAccount,
    createdLogin: state.createdLogin,
    generatedName: state.generatedName,
    profileData: state.profileData,
    canGoBack: state.canGoBack,

    // Helpers
    isLoading,
    getError,

    // Actions
    actions: {
      authenticateWithFirebase,
      authenticateWithLinkedNostr,
      retryLinkedNostrAuth,
      continueWithNewPubkey,
      generateNewAccount,
      bringOwnKeypair,
      completeProfile,
      completeLogin,
    },

    // Navigation
    goBack,
    reset,
  };
}
