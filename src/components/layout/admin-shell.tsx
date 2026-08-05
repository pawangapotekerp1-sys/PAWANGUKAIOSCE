import type { ReactNode } from "react";
import type { Icon } from "@phosphor-icons/react";
import { Link } from "react-router";
import { logout } from "../../lib/api/auth-api";
import Button from "../ui/button";


type AdminShellNavItem = {
  href: string;
  label: string;
  icon: Icon;
  active?: boolean;
};

type AdminShellProps = {
  children: ReactNode;
  title: string;
  description: string;
  navItems: AdminShellNavItem[];
};

function AdminShell({
  children,
  title,
  description,
  navItems,
}: AdminShellProps) {
  return (
    <main className="min-h-[100dvh] bg-[linear-gradient(180deg,_rgba(12,31,32,0.98),_rgba(18,58,60,0.98))] text-[var(--color-cream)]">
      <div className="grid min-h-[100dvh] w-full xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col overflow-hidden border-b border-[rgba(242,232,201,0.14)] bg-[linear-gradient(180deg,_rgba(9,28,29,0.99),_rgba(18,58,60,0.98))] px-6 py-6 xl:sticky xl:top-0 xl:h-[100dvh] xl:self-start xl:border-b-0 xl:border-r xl:border-[rgba(242,232,201,0.14)]">
          <div>
            <p className="font-mono text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--color-accent-ink-soft)]">
              Pawang Masuk Apoteker
            </p>
          </div>

          <nav className="mt-8 grid min-h-0 flex-1 gap-2 overflow-y-auto pr-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                className={[
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  item.active
                    ? "bg-[rgba(242,232,201,0.12)] text-[var(--color-cream-strong)]"
                    : "text-[var(--color-accent-ink-soft)] hover:bg-[rgba(242,232,201,0.08)] hover:text-[var(--color-cream-strong)]",
                ].join(" ")}
                to={item.href}
              >
                <item.icon size={18} weight="fill" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-6 flex items-center gap-2">

            <Button
              className="flex-1 border-[rgba(242,232,201,0.14)] bg-[rgba(242,232,201,0.08)] text-[var(--color-cream-strong)] hover:border-[rgba(242,232,201,0.2)] hover:bg-[rgba(242,232,201,0.12)]"
              type="button"
              variant="outline"
              onClick={() => void logout()}
            >
              Logout
            </Button>
          </div>
        </aside>
        <section className="px-4 py-4 text-[var(--color-ink)] sm:px-6 xl:pl-0 xl:pr-6 xl:py-6">
          <div className="rounded-[2rem] border border-[rgba(242,232,201,0.14)] bg-[rgba(255,252,244,0.96)] dark:bg-[#0f172a] dark:border-border dark:text-foreground px-5 py-5 shadow-[0_24px_60px_rgba(8,20,20,0.18)] sm:px-6 lg:px-8 w-full">
            <header className="border-b border-[rgba(15,46,47,0.08)] dark:border-border/60 pb-5">
              <p className="font-mono text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--color-teal-soft)] dark:text-cyan-400">
                Area admin
              </p>
              <h1 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-outline)] dark:text-foreground">
                {title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-ink-muted)] dark:text-muted-foreground">
                {description}
              </p>
            </header>

            <div className="pt-6">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default AdminShell;
