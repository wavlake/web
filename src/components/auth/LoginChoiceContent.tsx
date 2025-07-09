import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Mail, Key, LucideIcon } from "lucide-react";
import { toast } from "@/hooks/useToast";

export enum LoginChoice {
  GET_STARTED = "get-started",
  WAVLAKE_ACCOUNT = "wavlake-account",
  NOSTR_ACCOUNT = "nostr-account",
}

interface LoginChoiceOption {
  /** The choice value */
  value: LoginChoice;
  /** Button text */
  title: string;
  /** Descriptive text shown below the title */
  description: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Button variant */
  variant: "default" | "outline" | "ghost";
  /** Additional CSS classes */
  className?: string;
}

interface LoginChoiceContentProps {
  /** Callback fired when user selects an authentication option */
  onSelect: (choice: LoginChoice) => void;
}

/**
 * Common button styles for authentication choice buttons
 */
const CHOICE_BUTTON_BASE_CLASSES =
  "w-full h-auto py-4 px-4 rounded-xl text-left transition-all duration-200";
const CHOICE_BUTTON_CONTENT_CLASSES = "flex items-center gap-3 w-full";
const CHOICE_ICON_CLASSES = "w-5 h-5 shrink-0";
const CHOICE_TEXT_CONTAINER_CLASSES = "flex-1 min-w-0";
const CHOICE_TITLE_CLASSES = "font-medium";
const CHOICE_DESCRIPTION_CLASSES = "text-sm mt-1";

/**
 * Creates the configuration for authentication choice options.
 * Memoized to prevent unnecessary re-creation on each render.
 */
const createLoginChoices = (): LoginChoiceOption[] => [
  {
    value: LoginChoice.GET_STARTED,
    title: "Get Started",
    description: "New to Wavlake? We'll create an account for you",
    icon: Sparkles,
    variant: "default",
    className: "bg-primary hover:bg-primary/90 focus-visible:ring-primary",
  },
  {
    value: LoginChoice.WAVLAKE_ACCOUNT,
    title: "I have a Wavlake account",
    description: "Sign in with your existing email address",
    icon: Mail,
    variant: "outline",
    className: "border-2 hover:bg-muted/50 focus-visible:ring-muted",
  },
  {
    value: LoginChoice.NOSTR_ACCOUNT,
    title: "I have a Nostr account",
    description: "Sign in with your existing Nostr keys",
    icon: Key,
    variant: "ghost",
    className: "hover:bg-muted/50 focus-visible:ring-muted",
  },
];

/**
 * Renders a single authentication choice button
 */
interface ChoiceButtonProps {
  option: LoginChoiceOption;
  onSelect: (choice: LoginChoice) => void;
}

const ChoiceButton: React.FC<ChoiceButtonProps> = ({ option, onSelect }) => {
  const { value, title, description, icon: Icon, variant, className } = option;

  const handleClick = () => {
    try {
      // Validate enum value before proceeding
      if (!Object.values(LoginChoice).includes(value)) {
        throw new Error(`Invalid login choice: ${value}`);
      }
      onSelect(value);
    } catch (error) {
      console.error("Error selecting login choice:", error);
      toast({
        title: "Error",
        description: "Unable to proceed with authentication. Please try again.",
        variant: "destructive",
      });
    }
  };

  const descriptionColorClass = useMemo(
    () =>
      variant === "default"
        ? "text-primary-foreground/80"
        : "text-muted-foreground",
    [variant]
  );

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      className={`${CHOICE_BUTTON_BASE_CLASSES} ${className}`}
      size="lg"
      aria-label={`${title}: ${description}`}
    >
      <div className={CHOICE_BUTTON_CONTENT_CLASSES}>
        <Icon className={CHOICE_ICON_CLASSES} aria-hidden="true" />
        <div className={CHOICE_TEXT_CONTAINER_CLASSES}>
          <div className={CHOICE_TITLE_CLASSES}>{title}</div>
          <div
            className={`${CHOICE_DESCRIPTION_CLASSES} ${descriptionColorClass}`}
          >
            {description}
          </div>
        </div>
      </div>
    </Button>
  );
};

/**
 * Authentication choice content component that can be used standalone (outside of dialog).
 * This is a pure content component without dialog wrapper, perfect for embedding
 * in custom page layouts.
 *
 * Features:
 * - Three-option interface with clear visual hierarchy
 * - Descriptive text to guide user choice
 * - Full accessibility compliance (WCAG 2.1 AA)
 * - Responsive design for all device types
 * - Type-safe enum-based choice handling
 *
 * @param onSelect - Callback fired when user selects an authentication option
 * @returns JSX element containing the choice content
 */
export const LoginChoiceContent: React.FC<LoginChoiceContentProps> = ({
  onSelect,
}) => {
  const loginChoices = useMemo(() => createLoginChoices(), []);

  return (
    <div
      className="space-y-4"
      role="group"
      aria-label="Authentication options"
    >
      {loginChoices.map((option) => (
        <ChoiceButton
          key={option.value}
          option={option}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

export default LoginChoiceContent;