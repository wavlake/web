import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export const GenericStep = ({
  title,
  description,
  children,
  handleBack,
  header,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  handleBack?: () => void;
  header?: React.ReactNode;
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex flex-col px-2 justify-center sm:p-6 md:p-8">
        {header}
        <div className="w-full sm:max-w-md mx-auto">
          <Card className="border-0 shadow-lg sm:border sm:shadow-sm">
            <CardHeader className="pb-4 sm:pb-6 px-4 sm:px-6">
              {handleBack && (
                <div className="flex items-center justify-between mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="p-2 h-8 w-8"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex-1" />
                </div>
              )}
              <CardTitle className="text-center text-lg sm:text-xl">
                {title}
              </CardTitle>
              <CardDescription className="text-center text-sm sm:text-base">
                {description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
              {children}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
