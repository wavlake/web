import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/useIsMobile";
import { LucideIcon } from "lucide-react";

export interface TabItem {
  label: string;
  value: string;
  icon: LucideIcon;
  badgeCount?: number;
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
                    "flex items-center space-x-2 whitespace-nowrap relative",
                    isActive && "bg-primary text-primary-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.badgeCount && tab.badgeCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="h-5 w-5 p-0 flex items-center justify-center text-xs min-w-[20px] ml-1"
                    >
                      {tab.badgeCount > 99 ? '99+' : tab.badgeCount}
                    </Badge>
                  )}
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
                  "justify-start space-x-2 w-full relative",
                  isActive && "bg-primary text-primary-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{tab.label}</span>
                {tab.badgeCount && tab.badgeCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="h-5 w-5 p-0 flex items-center justify-center text-xs min-w-[20px]"
                  >
                    {tab.badgeCount > 99 ? '99+' : tab.badgeCount}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}