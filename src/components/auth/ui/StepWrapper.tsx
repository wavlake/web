/**
 * StepWrapper Component
 *
 * Provides a consistent layout and navigation for auth flow steps.
 * Handles back navigation, step indicators, and consistent spacing.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, X } from "lucide-react";

interface StepWrapperProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  canGoBack?: boolean;
  onBack?: () => void;
  onCancel?: () => void;
  currentStep?: string;
  totalSteps?: number;
  className?: string;
  header?: React.ReactNode;
}

export function StepWrapper({
  title,
  description,
  children,
  canGoBack = false,
  onBack,
  onCancel,
  currentStep,
  totalSteps,
  header,
}: StepWrapperProps) {
  return (
    <div className="flex flex-col justify-center min-h-screen w-full max-w-md mx-auto px-2">
      {/* Header with navigation */}
      {header}

      <div className="flex items-center justify-between mb-6">
        {canGoBack && onBack ? (
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        ) : (
          <div className="w-10" /> // Spacer
        )}

        {/* Step indicator */}
        {currentStep && totalSteps && (
          <div className="text-sm text-muted-foreground">
            Step {getStepNumber(currentStep)} of {totalSteps}
          </div>
        )}

        {onCancel ? (
          <Button variant="ghost" size="sm" onClick={onCancel} className="p-2">
            <X className="w-4 h-4" />
          </Button>
        ) : (
          <div className="w-10" /> // Spacer
        )}
      </div>

      {/* Main content */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{title}</CardTitle>
          {description && (
            <CardDescription className="text-base">
              {description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}

// Helper to get step number from step name
function getStepNumber(step: string): number {
  const stepMap: Record<string, number> = {
    "user-type": 1,
    "artist-type": 2,
    "profile-setup": 3,
    "firebase-backup": 4,
    complete: 5,
  };
  return stepMap[step] || 1;
}
