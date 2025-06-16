import Header from "@/components/ui/Header";
import { Footer } from "@/components/Footer";
import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
  title?: React.ReactNode;
  className?: string;
}

export function Layout({ children, title, className }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header title={title} />
      <main className={`flex-grow ${className || "container mx-auto px-4 py-8"}`}>
        {children}
      </main>
      <Footer />
    </div>
  );
}