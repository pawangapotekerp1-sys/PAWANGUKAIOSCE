import type { ReactNode } from "react";
import { useOutletContext } from "react-router";
import ProductShell from "../../components/layout/product-shell";
import AdminShell from "../../components/layout/admin-shell";
import SectionHeading from "../../components/ui/section-heading";
import type { UserRole } from "../../lib/auth/permissions";
import { createScheduledOpsNavItems } from "../../mocks/scheduled-ops-content";
import {
  createProductNavItems,
  productShellMeta,
  resolveStudentTierLabel,
} from "../../mocks/student-dashboard";

type ScheduledOpsShellProps = {
  activeHref: string;
  children: ReactNode;
  description: string;
  title: string;
};

type ScheduledOpsOutletContext = {
  role: UserRole;
};

function ScheduledOpsShell({
  activeHref,
  children,
  description,
  title,
}: ScheduledOpsShellProps) {
  const { role } = useOutletContext<ScheduledOpsOutletContext>();

  if (role === "mentor") {
    return (
      <ProductShell
        brand={productShellMeta.brand}
        tierLabel={resolveStudentTierLabel(role)}
        navItems={createProductNavItems(activeHref, role)}
      >
        <SectionHeading
          description={description}
          eyebrow="Event terjadwal"
          title={title}
        />
        <div className="mt-6">{children}</div>
      </ProductShell>
    );
  }

  return (
    <AdminShell
      description={description}
      navItems={createScheduledOpsNavItems(activeHref)}
      title={title}
    >
      {children}
    </AdminShell>
  );
}

export default ScheduledOpsShell;
