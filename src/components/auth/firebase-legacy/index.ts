// Main component
export { FirebaseLegacyLogin } from "./FirebaseLegacyLogin";

// Types
export * from "./types";

// Constants
export * from "./constants";

// Components
export { PubkeyCard } from "./PubkeyCard";
export { StepHeader } from "./StepHeader";
export { AuthMethodTabs } from "./AuthMethodTabs";

// Steps
export { LoginStep } from "./steps/LoginStep";
export { PubkeySelectionStep } from "./steps/PubkeySelectionStep";
export { NostrSetupStep } from "./steps/NostrSetupStep";
export { LinkingStep } from "./steps/LinkingStep";
export { CompleteStep } from "./steps/CompleteStep";

// Hook
export { useFirebaseLegacyAuth } from "./useFirebaseLegacyAuth";