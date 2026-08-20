import type { ReactNode } from "react";
import { Link } from "react-router";
import { getButtonStyleProps } from "../ui/button";


type MarketingShellProps = {
  children: ReactNode;
  footer?: ReactNode;
};

const navLinks = [
  { href: "#fitur", label: "Fitur" },
  { href: "#simulasi", label: "Simulasi" },
  { href: "#harga", label: "Harga" },
] as const;

function MarketingShell({ children, footer }: MarketingShellProps) {
  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[linear-gradient(180deg,_rgba(242,232,201,0.98),_rgba(230,224,203,0.94))] text-[var(--color-ink)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top_right,_rgba(31,111,115,0.14),_transparent_50%),radial-gradient(circle_at_top_left,_rgba(244,197,66,0.2),_transparent_42%)]"
      />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[1400px] flex-col px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <header className="rounded-[2rem] border border-[var(--color-outline-soft)] bg-[rgba(255,252,244,0.76)] px-4 py-4 shadow-[0_18px_42px_rgba(15,46,47,0.06)] backdrop-blur-sm sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] overflow-hidden shrink-0 bg-white">
                <img src="/logo.jpg" alt="Logo" className="h-full w-full object-cover" />
              </div>
              <div>
                <p className="font-mono text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--color-teal-soft)]">
                  Pawang Apoteker
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--color-ink-muted)]">
                  Latihan serius untuk mahasiswa dan lulusan baru farmasi.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
              <nav aria-label="Navigasi beranda">
                <ul className="flex flex-wrap items-center gap-2 text-sm font-medium text-[var(--color-ink-muted)]">
                  {navLinks.map((item) => (
                    <li key={item.href}>
                      <a
                        className="inline-flex min-h-10 items-center rounded-full px-4 transition hover:bg-[rgba(31,111,115,0.08)] hover:text-[var(--color-outline)] active:translate-y-px active:scale-[0.99]"
                        href={item.href}
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="flex items-center gap-2">

                <Link
                  {...getButtonStyleProps({
                    variant: "primary",
                  })}
                  to="/auth/login"
                >
                  Masuk
                </Link>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        {footer ? <div className="pt-6">{footer}</div> : null}
      </div>
    </main>
  );
}

export default MarketingShell;
