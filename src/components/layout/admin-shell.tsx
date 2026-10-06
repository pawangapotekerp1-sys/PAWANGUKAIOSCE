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
  title?: string;
  description?: string;
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
        <div className="pt-2">{children}</div>
      </div>
    </ProductShell>
  );
}

export default AdminShell;
