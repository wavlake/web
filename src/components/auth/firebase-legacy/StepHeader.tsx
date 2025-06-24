import React from "react";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

interface StepHeaderProps {
  onBack?: () => void;
  title: string;
  description: string;
}

export function StepHeader({ onBack, title, description }: StepHeaderProps) {
  return (
    <CardHeader className="text-center pb-0 pt-4 px-6">
      {onBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="absolute left-2 top-2 gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      )}
      <CardTitle className="text-xl">{title}</CardTitle>
      <CardDescription className="text-sm">{description}</CardDescription>
    </CardHeader>
  );
}