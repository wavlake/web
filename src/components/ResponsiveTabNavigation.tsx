import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/useIsMobile";
import { LucideIcon } from "lucide-react";

export interface TabItem {
  label: string;
  value: string;
  icon: LucideIcon;
}

interface ResponsiveTabNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (value: string) => void;
  forceHorizontal?: boolean;
  className?: string;
}

export function ResponsiveTabNavigation({
  tabs,
  activeTab,
  onTabChange,
  forceHorizontal = false,
  className,
}: ResponsiveTabNavigationProps) {
  const isMobile = useIsMobile();
  const isHorizontal = isMobile || forceHorizontal;

  if (isHorizontal) {
    return (
      <div className={cn("border-b bg-background", className)}>
        <ScrollArea className="w-full">
          <div className="flex space-x-1 p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.value;
              
              return (
                <Button
                  key={tab.value}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onTabChange(tab.value)}
                  className={cn(
                    "flex items-center space-x-2 whitespace-nowrap",
                    isActive && "bg-primary text-primary-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Vertical layout for desktop
  return (
    <div className={cn("w-64 border-r bg-background", className)}>
      <ScrollArea className="h-full">
        <div className="flex flex-col space-y-1 p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            
            return (
              <Button
                key={tab.value}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => onTabChange(tab.value)}
                className={cn(
                  "justify-start space-x-2 w-full",
                  isActive && "bg-primary text-primary-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}