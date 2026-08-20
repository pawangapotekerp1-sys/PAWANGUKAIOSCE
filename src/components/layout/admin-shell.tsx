import type { ReactNode } from "react";
import type { Icon } from "@phosphor-icons/react";
import ProductShell from "./product-shell";

type AdminShellNavItem = {
  href: string;
  label: string;
  icon: Icon | any;
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
    <ProductShell
      brand="Pawang Apoteker"
      tierLabel="Admin"
      navItems={navItems as any}
    >
      <div className="flex flex-col w-full space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
          <div>
            <p className="font-mono text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-primary mb-3">
              Area Admin
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="text-base text-muted-foreground mt-2">
              {description}
            </p>
          </div>
        </div>
        
        <div className="pt-2">{children}</div>
      </div>
    </ProductShell>
  );
}

export default AdminShell;
