import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LinkingStep() {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Linking Your Accounts...</CardTitle>
      </CardHeader>
      <CardContent className="flex justify-center py-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">
            Please wait while we securely link your accounts
          </p>
        </div>
      </CardContent>
    </Card>
  );
}