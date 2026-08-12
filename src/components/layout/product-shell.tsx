import { type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { LogOut, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { logout } from "../../lib/api/auth-api";
import Button from "../ui/button";

import { cn } from "@/lib/utils";

type ProductShellNavChildItem = {
  href: string;
  label: string;
  active?: boolean;
};

type ProductShellNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  children?: ProductShellNavChildItem[];
};

type ProductShellProps = {
  children: ReactNode;
  brand: string;
  tierLabel: string;
  navItems: ProductShellNavItem[];
};

function ProductShell({
  children,
  brand,
  tierLabel,
  navItems,
}: ProductShellProps) {
  return (
    <div className="min-h-screen w-full bg-clinical-surface text-clinical-text-primary flex flex-col relative">
      {/* Top Navigation Bar Header */}
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-background/90 backdrop-blur-xl border-b border-clinical-border/60 shadow-xs">
        <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16">
          <div className="flex h-16 sm:h-20 items-center justify-between gap-4">
            
            {/* Left: Brand Logo & Title */}
            <div className="flex items-center gap-3.5 shrink-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-2xs">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-sm font-black uppercase tracking-[0.18em] text-foreground">
                  {brand}
                </span>
                {tierLabel && (
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {tierLabel}
                  </span>
                )}
              </div>
            </div>

            {/* Center: Nav — flex-1 evenly spaced links across top bar */}
            <nav className="hidden md:flex flex-1 items-center justify-center gap-1 lg:gap-4 xl:gap-6 py-1 px-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-bold transition-all duration-200 group relative whitespace-nowrap",
                      item.active
                        ? "bg-primary/10 text-primary shadow-xs font-black"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                        item.active ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right: Theme Toggle & Logout — shrink-0 */}
            <div className="flex shrink-0 items-center gap-2">

              <Button
                className="justify-center text-sm font-bold cursor-pointer transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 rounded-2xl px-5 py-2.5"
                variant="outline"
                size="sm"
                onClick={() => void logout()}
              >
                <LogOut className="h-4 w-4 mr-2 text-destructive" />
                <span>Logout</span>
              </Button>
            </div>
          </div>

          {/* Mobile Horizontal Navigation Bar */}
          <div className="flex md:hidden items-center gap-1 overflow-x-auto py-2.5 border-t border-border/30">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shrink-0",
                    item.active
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full relative z-10">
        <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default ProductShell;
