/**
 * Signup State Machine
 *
 * Manages the state for new user signup flow including user type selection,
 * profile setup, and optional Firebase backup.
 */

import { useReducer, useCallback, useMemo } from "react";
import {
  createAsyncAction,
  handleBaseActions,
  isOperationLoading,
  getOperationError,
} from "../utils/stateMachineUtils";
import { ActionResult, SignupState, SignupAction, SignupStep } from "./types";
import { type ProfileData } from "@/types/profile";
import { makeLinkAccountRequest } from "../useLinkAccount";
import { User } from "firebase/auth";

const initialState: SignupState = {
  step: "user-type",
  isArtist: false,
  isSoloArtist: true,
  isLoading: {},
  errors: {},
  canGoBack: false,
  account: null,
  createdLogin: null,
  generatedName: null,
  profileData: null,
  firebaseUser: null,
};

function signupReducer(state: SignupState, action: SignupAction): SignupState {
  // Handle base async actions first
  const baseResult = handleBaseActions(state, action);
  if (baseResult) {
    return baseResult as SignupState;
  }

  switch (action.type) {
    case "SET_USER_TYPE":
      return {
        ...state,
        isArtist: action.isArtist,
        step: action.isArtist ? "artist-type" : "profile-setup",
        canGoBack: true,
      };

    case "SET_ARTIST_TYPE":
      return {
        ...state,
        isSoloArtist: action.isSolo,
        step: "profile-setup",
        canGoBack: true,
      };

    case "ACCOUNT_CREATED":
      return {
        ...state,
        createdLogin: action.login,
        generatedName: action.generatedName,
      };

    case "PROFILE_COMPLETED":
      return {
        ...state,
        step: state.isArtist ? "firebase-backup" : "complete",
        canGoBack: state.isArtist,
        profileData: action.profileData,
      };

    case "FIREBASE_ACCOUNT_CREATED":
      return {
        ...state,
        step: "complete",
        canGoBack: false,
        firebaseUser: action.firebaseUser,
      };

    case "LOGIN_COMPLETED":
      return {
        ...state,
        step: "complete",
        canGoBack: false,
      };

    case "FIREBASE_BACKUP_SKIPPED":
      return {
        ...state,
        step: "complete",
        canGoBack: false,
      };

    case "GO_BACK": {
      const previousStep = getPreviousStep(state.step, state.isArtist);
      return {
        ...state,
        step: previousStep,
        canGoBack: previousStep !== "user-type",
      };
    }

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

function getPreviousStep(
  currentStep: SignupStep,
  isArtist: boolean
): SignupStep {
  switch (currentStep) {
    case "artist-type":
      return "user-type";
    case "profile-setup":
      return isArtist ? "artist-type" : "user-type";
    case "firebase-backup":
      return "profile-setup";
    default:
      return "user-type";
  }
}

// Hook interface
export interface UseSignupStateMachineResult {
  // State
  step: SignupStep;
  isArtist: boolean;
  isSoloArtist: boolean;
  canGoBack: boolean;
  account: unknown | null;
  createdLogin: import("@nostrify/react/login").NLoginType | null;
  generatedName: string | null;
  profileData: ProfileData | null;
  firebaseUser: import("firebase/auth").User | null;

  // Loading helpers
  isLoading: (operation: string) => boolean;
  getError: (operation: string) => Error | null;

  // Promise-based actions
  actions: {
    setUserType: (isArtist: boolean) => Promise<ActionResult>;
    setArtistType: (isSolo: boolean) => Promise<ActionResult>;
    completeProfile: (profileData: ProfileData) => Promise<ActionResult>;
    createFirebaseAccount: (
      email: string,
      password: string
    ) => Promise<ActionResult>;
    skipFirebaseBackup: () => void;
    completeLogin: () => Promise<ActionResult>;
  };

  // Navigation
  goBack: () => void;
  reset: () => void;
}

export interface SignupStateMachineDependencies {
  createAccount: () => Promise<{
    login: import("@nostrify/react/login").NLoginType;
    generatedName: string;
  }>;
  saveProfile: (data: ProfileData) => Promise<void>;
  createFirebaseAccount: (email: string, password: string) => Promise<User>;
  addLogin: (login: import("@nostrify/react/login").NLoginType) => {
    pubkey: string;
    signer: {
      signEvent: (event: unknown) => Promise<unknown>;
      getPublicKey?: () => Promise<string>;
    };
  };
  setupAccount: (
    profileData: ProfileData | null,
    generatedName: string
  ) => Promise<void>;
}

export function useSignupStateMachine(
  dependencies: SignupStateMachineDependencies
): UseSignupStateMachineResult {
  const [state, dispatch] = useReducer(signupReducer, initialState);

  // Create async action handlers
  const setUserType = useMemo(
    () =>
      createAsyncAction(
        "setUserType",
        async (isArtist: boolean) => {
          // Update state first
          dispatch({ type: "SET_USER_TYPE", isArtist });

          // For listeners, create account immediately
          if (!isArtist) {
            const { login, generatedName } = await dependencies.createAccount();
            dispatch({ type: "ACCOUNT_CREATED", login, generatedName });
            return { login, generatedName };
          }

          return {};
        },
        dispatch
      ),
    [dependencies]
  );

  const setArtistType = useMemo(
    () =>
      createAsyncAction(
        "setArtistType",
        async (isSolo: boolean) => {
          // Update state first
          dispatch({ type: "SET_ARTIST_TYPE", isSolo });

          // Create account for profile setup
          const { login, generatedName } = await dependencies.createAccount();
          dispatch({ type: "ACCOUNT_CREATED", login, generatedName });
          return { login, generatedName };
        },
        dispatch
      ),
    [dependencies]
  );

  const completeProfile = useMemo(
    () =>
      createAsyncAction(
        "completeProfile",
        async (profileData: ProfileData) => {
          await dependencies.saveProfile(profileData);
          dispatch({ type: "PROFILE_COMPLETED", profileData });

          return {};
        },
        dispatch
      ),
    [dependencies]
  );

  const createFirebaseAccount = useMemo(
    () =>
      createAsyncAction(
        "createFirebaseAccount",
        async (email: string, password: string) => {
          // Create Firebase account
          const firebaseUser = await dependencies.createFirebaseAccount(
            email,
            password
          );

          try {
            // Get Firebase token for linking
            const firebaseToken = await firebaseUser.getIdToken();

            // Use the created login directly instead of getCurrentUser to avoid race condition
            if (!state.createdLogin) {
              throw new Error("No created login available for linking");
            }

            // Log in the Nostr user and get the user object back
            const user = dependencies.addLogin(state.createdLogin);

            // Attempt atomic linking using the user's signer
            await makeLinkAccountRequest({
              pubkey: user.pubkey,
              firebaseUid: firebaseUser.uid,
              authToken: firebaseToken,
              signer: user.signer,
            });

            // Success - go directly to complete
            dispatch({ type: "LOGIN_COMPLETED" });
            return { firebaseUser, linked: true };
          } catch (linkError) {
            console.warn(
              "Firebase account created but linking failed:",
              linkError
            );
            // Continue anyway - user can link later
            dispatch({
              type: "FIREBASE_ACCOUNT_CREATED",
              firebaseUser: firebaseUser as import("firebase/auth").User,
            });
            return { firebaseUser, linked: false, linkError };
          }
        },
        dispatch
      ),
    [dependencies, state.createdLogin]
  );

  const skipFirebaseBackup = useCallback(() => {
    dispatch({ type: "FIREBASE_BACKUP_SKIPPED" });
  }, []);

  const completeLogin = useMemo(
    () =>
      createAsyncAction(
        "completeLogin",
        async () => {
          if (state.createdLogin && state.generatedName) {
            // Add the login to actually log the user in (if not already done during linking)
            dependencies.addLogin(state.createdLogin);

            // Setup account (create wallet, publish profile)
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
    isArtist: state.isArtist,
    isSoloArtist: state.isSoloArtist,
    canGoBack: state.canGoBack,
    account: state.account,
    createdLogin: state.createdLogin,
    generatedName: state.generatedName,
    profileData: state.profileData,
    firebaseUser: state.firebaseUser,

    // Helpers
    isLoading,
    getError,

    // Actions
    actions: {
      setUserType,
      setArtistType,
      completeProfile,
      createFirebaseAccount,
      skipFirebaseBackup,
      completeLogin,
    },

    // Navigation
    goBack,
    reset,
  };
}
