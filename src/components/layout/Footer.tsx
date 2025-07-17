import { Button } from "@/components/ui/button";
import {
  Music,
  Radio,
  Upload,
  Download,
  Twitter,
  Github,
  Mail,
  ExternalLink,
} from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-black text-white mt-16">
      <div className="container max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Wavlake Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 relative">
                <img
                  src="/wavlake-icon-96.png"
                  alt="Wavlake"
                  width={32}
                  height={32}
                  className="object-contain filter bg-transparent"
                />
              </div>
              <span className="text-xl font-bold">Wavlake</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Stream Anywhere, Earn Everywhere. A new online world where
              creators and listeners can freely transact with one another in an
              open ecosystem.
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white"
                asChild
              >
                <a href="https://twitter.com/wavlake" target="_blank" rel="noopener noreferrer">
                  <Twitter className="h-5 w-5" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white"
                asChild
              >
                <a href="https://github.com/wavlake" target="_blank" rel="noopener noreferrer">
                  <Github className="h-5 w-5" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white"
                asChild
              >
                <a href="mailto:hello@wavlake.com">
                  <Mail className="h-5 w-5" />
                </a>
              </Button>
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Music</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://wavlake.com"
                  className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Music className="h-4 w-4" />
                  Browse Music
                </a>
              </li>
              <li>
                <a
                  href="/admin"
                  className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Music
                </a>
              </li>
              <li>
                <a
                  href="https://wavlake.com/radio"
                  className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Radio className="h-4 w-4" />
                  Wavlake Radio
                </a>
              </li>
              <li>
                <a
                  href="https://wavlake.com/charts"
                  className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Music className="h-4 w-4" />
                  Charts
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Resources</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Artist Guide
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  API Documentation
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Community
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Zine
                </a>
              </li>
            </ul>
          </div>

          {/* Mobile Apps */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Get the App</h3>
            <p className="text-gray-400 text-sm">
              Download our mobile player for iOS and Android
            </p>
            <div className="space-y-3">
              <a
                href="#"
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Download for iOS</span>
              </a>
              <a
                href="#"
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Download for Android</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400">
              <span>© 2025 Wavlake. All rights reserved.</span>
              <a href="#" className="hover:text-white transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Terms of Service
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Cookie Policy
              </a>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Powered by</span>
              <a
                href="https://bitcoin.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1"
              >
                Lightning & Nostr
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}