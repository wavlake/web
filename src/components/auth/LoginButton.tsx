import { User } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { useNavigate } from "react-router-dom";

export function LoginButton() {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate("/login");
  };

  return (
    <Button
      onClick={handleLogin}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground w-full font-medium transition-all hover:bg-primary/90 animate-scale-in"
    >
      <User className="w-3.5 h-3.5" />
      <span>Log in</span>
    </Button>
  );
}
