import {
  ChevronDown,
  LogOut,
  UserIcon,
  UserPlus,
  Plus,
  Settings,
  Edit,
  User,
  Bell,
  Wallet,
  Info,
  Download,
  BarChart3,
  Database,
  Link as LinkIcon,
  LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.tsx";
import { useLoggedInAccounts } from "@/hooks/useLoggedInAccounts";
import { Link, useNavigate } from "react-router-dom";
import {
  useUnreadNotificationsCount,
  useMarkAllNotificationsAsRead,
} from "@/hooks/useNotifications";
import { useCashuStore } from "@/stores/cashuStore";
import { useState } from "react";
import { PWAInstallInstructions } from "@/components/PWAInstallInstructions";
import { usePWA } from "@/hooks/usePWA";
import { useAccountLinkingStatus } from "@/hooks/useAccountLinkingStatus";
import { LoginButton } from "./auth/v3/LoginButton";

// Menu item configuration
interface MenuItem {
  icon: LucideIcon;
  label: string;
  to: string;
  onClick?: () => void;
  showBadge?: boolean;
  condition?: boolean;
  className?: string;
}

// Reusable menu item component
const MenuItemLink = ({
  icon: Icon,
  label,
  to,
  onClick,
  showBadge,
  badgeCount = 0,
  className = "",
}: MenuItem & { badgeCount?: number }) => (
  <DropdownMenuItem
    asChild
    className={`flex items-center gap-3 md:gap-2 cursor-pointer p-1.5 rounded-md text-sm ${className}`}
  >
    <Link to={to} onClick={onClick}>
      <Icon className="w-4 h-4 md:w-3.5 md:h-3.5" />
      <span>{label}</span>
      {showBadge && badgeCount > 0 && (
        <span className="ml-auto bg-primary text-primary-foreground text-xs font-medium px-1.5 py-0.5 rounded-full">
          {badgeCount > 99 ? "99" : badgeCount}
        </span>
      )}
    </Link>
  </DropdownMenuItem>
);

// Notification badge component
const NotificationBadge = ({ count }: { count: number }) => {
  if (count === 0) return null;

  return (
    <div className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-background">
      {count > 99 ? "99" : count}
    </div>
  );
};

export function UserDropdownMenu() {
  const { currentUser, otherUsers, setLogin, removeLogin } =
    useLoggedInAccounts();
  const navigate = useNavigate();
  const unreadCount = useUnreadNotificationsCount();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const cashuStore = useCashuStore();
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const { isInstallable, isRunningAsPwa, promptInstall } = usePWA();
  const { isLinked } = useAccountLinkingStatus();

  if (!currentUser) {
    return <LoginButton />;
  }

  const handleInstallClick = async () => {
    const success = isInstallable ? await promptInstall() : false;
    if (!success) {
      setShowInstallInstructions(true);
    }
  };

  const handleLogout = async () => {
    navigate("/login", { replace: true });

    if (currentUser) {
      removeLogin(currentUser.id);
    }

    cashuStore.clearStore();

    try {
      const { initializeFirebaseAuth } = await import("@/lib/firebaseAuth");
      const { auth } = initializeFirebaseAuth();
      if (auth.currentUser) {
        await auth.signOut();
      }
    } catch (error) {
      console.error("Error signing out from Firebase:", error);
    }

    const wavlakeOnboardingStored = localStorage.getItem("wavlake-onboarding");
    localStorage.clear();
    if (wavlakeOnboardingStored) {
      localStorage.setItem("wavlake-onboarding", wavlakeOnboardingStored);
    }
  };

  // Menu items configuration
  const menuItems: MenuItem[] = [
    {
      icon: User,
      label: "View Profile",
      to: `/profile/${currentUser?.pubkey || ""}`,
    },
    { icon: BarChart3, label: "Dashboard", to: "/dashboard" },
    { icon: Wallet, label: "Wallet", to: "/wallet" },
    {
      icon: Bell,
      label: "Notifications",
      to: "/settings/notifications",
      onClick: () => unreadCount > 0 && markAllAsRead(),
      showBadge: true,
    },
    { icon: Settings, label: "Settings", to: "/settings" },
    { icon: LinkIcon, label: "Account Linking", to: "/account-linking" },
    {
      icon: Database,
      label: "Legacy API Test",
      to: "/legacy-api-test",
      condition: isLinked,
    },
    { icon: Info, label: "About Wavlake", to: "/about" },
  ];

  const displayName = currentUser?.metadata.name || currentUser?.pubkey || "";
  const avatarChar = currentUser?.metadata.name?.charAt(0);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 p-1.5 rounded-full w-full text-foreground max-w-56 focus:outline-none"
          >
            <div className="relative">
              <Avatar className="w-8 h-8 rounded-md">
                <AvatarImage
                  src={currentUser?.metadata.picture}
                  alt={displayName}
                />
                <AvatarFallback>
                  {avatarChar || <UserIcon className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>
              <NotificationBadge count={unreadCount} />
            </div>
            <div className="flex-1 text-left hidden md:block truncate">
              <p className="font-medium text-xs truncate">{displayName}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-52 p-1.5 animate-scale-in">
          {menuItems.map((item, index) => {
            if (item.condition === false) return null;

            return (
              <MenuItemLink
                key={index}
                {...item}
                badgeCount={item.showBadge ? unreadCount : 0}
              />
            );
          })}

          {!isRunningAsPwa && (
            <DropdownMenuItem
              onClick={handleInstallClick}
              className="flex items-center gap-3 md:gap-2 cursor-pointer p-1.5 rounded-md text-sm"
            >
              <Download className="w-4 h-4 md:w-3.5 md:h-3.5" />
              <span>Install App</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator className="my-1" />

          <DropdownMenuItem
            onClick={handleLogout}
            className="flex items-center gap-3 md:gap-2 cursor-pointer p-1.5 rounded-md text-red-500 text-sm"
          >
            <LogOut className="w-4 h-4 md:w-3.5 md:h-3.5" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PWAInstallInstructions
        isOpen={showInstallInstructions}
        onClose={() => setShowInstallInstructions(false)}
      />
    </>
  );
}
