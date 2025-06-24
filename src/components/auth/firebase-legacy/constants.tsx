import { Mail, Lock, Shield } from "lucide-react";
import type { AuthMethod } from "./types";

export const AUTH_METHODS: AuthMethod[] = [
  {
    type: "extension",
    label: "Extension",
    icon: <Shield className="w-8 h-8" />,
    description: "Use a browser extension",
  },
  {
    type: "nsec",
    label: "Key",
    icon: <Lock className="w-8 h-8" />,
    description: "Enter your secret key",
  },
  {
    type: "bunker",
    label: "Bunker",
    icon: <Shield className="w-8 h-8" />,
    description: "Connect with bunker URI",
  },
];
