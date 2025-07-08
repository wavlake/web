import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sparkles, Mail, Key, LucideIcon } from 'lucide-react';
import { toast } from '@/hooks/useToast';

/**
 * Authentication choice options for the login flow
 */
export enum LoginChoice {
  GET_STARTED = 'get-started',
  WAVLAKE_ACCOUNT = 'wavlake-account',
  NOSTR_ACCOUNT = 'nostr-account'
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
  variant: 'default' | 'outline' | 'ghost';
  /** Additional CSS classes */
  className?: string;
}

interface LoginChoiceStepProps {
  /** Callback fired when user selects an authentication option */
  onSelect: (choice: LoginChoice) => void;
}

/**
 * Common button styles for authentication choice buttons
 */
const CHOICE_BUTTON_BASE_CLASSES = "w-full h-auto py-4 px-4 rounded-xl text-left transition-all duration-200";
const CHOICE_BUTTON_CONTENT_CLASSES = "flex items-center gap-3 w-full";
const CHOICE_ICON_CLASSES = "w-5 h-5 shrink-0";
const CHOICE_TEXT_CONTAINER_CLASSES = "flex-1 min-w-0";
const CHOICE_TITLE_CLASSES = "font-medium";
const CHOICE_DESCRIPTION_CLASSES = "text-sm mt-1";

/**
 * Configuration for authentication choice options
 */
const LOGIN_CHOICES: LoginChoiceOption[] = [
  {
    value: LoginChoice.GET_STARTED,
    title: 'Get Started',
    description: "New to Wavlake? We'll create an account for you",
    icon: Sparkles,
    variant: 'default',
    className: 'bg-primary hover:bg-primary/90 focus-visible:ring-primary'
  },
  {
    value: LoginChoice.WAVLAKE_ACCOUNT,
    title: 'I have a Wavlake account',
    description: 'Sign in with your existing email address',
    icon: Mail,
    variant: 'outline',
    className: 'border-2 hover:bg-muted/50 focus-visible:ring-muted'
  },
  {
    value: LoginChoice.NOSTR_ACCOUNT,
    title: 'I have a Nostr account',
    description: 'Sign in with your existing Nostr keys',
    icon: Key,
    variant: 'ghost',
    className: 'hover:bg-muted/50 focus-visible:ring-muted'
  }
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
      onSelect(value);
    } catch (error) {
      console.error('Error selecting login choice:', error);
      toast({
        title: 'Error',
        description: 'Unable to proceed with authentication. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const descriptionColorClass = variant === 'default' 
    ? 'text-primary-foreground/80' 
    : 'text-muted-foreground';

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
          <div className={`${CHOICE_DESCRIPTION_CLASSES} ${descriptionColorClass}`}>
            {description}
          </div>
        </div>
      </div>
    </Button>
  );
};

/**
 * LoginChoiceStep component presents users with three authentication options:
 * - Get Started (new users)
 * - I have a Wavlake account (legacy users) 
 * - I have a Nostr account (existing Nostr users)
 */
export const LoginChoiceStep: React.FC<LoginChoiceStepProps> = ({ onSelect }) => {
  return (
    <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl">
      <DialogHeader className="px-6 pt-6 pb-0 relative">
        <DialogTitle className="text-xl font-semibold text-center">
          Welcome to Wavlake
        </DialogTitle>
        <DialogDescription className="text-center text-muted-foreground mt-2">
          Choose how you'd like to get started
        </DialogDescription>
      </DialogHeader>
      
      <div className="px-6 py-8 space-y-4" role="group" aria-label="Authentication options">
        {LOGIN_CHOICES.map((option) => (
          <ChoiceButton 
            key={option.value} 
            option={option} 
            onSelect={onSelect} 
          />
        ))}
      </div>
    </DialogContent>
  );
};