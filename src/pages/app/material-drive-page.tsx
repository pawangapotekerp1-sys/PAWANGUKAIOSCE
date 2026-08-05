import { useSearchParams } from "react-router";
import ProductShell from "../../components/layout/product-shell";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";
import { useSession } from "../../lib/auth/use-session";
import { DriveExplorer } from "../../components/DriveExplorer/DriveExplorer";

type MaterialDrivePageProps = {
  driveType: 'rekaman' | 'ppt';
};

export default function MaterialDrivePage({ driveType }: MaterialDrivePageProps) {
  const [searchParams] = useSearchParams();
  const { user } = useSession();
  const currentHref = `/app/${driveType === 'rekaman' ? 'rekaman-kelas' : 'materi-ppt'}`;
  const studentShell = useStudentShell(currentHref);
  
  // If mode=student, force student view (read-only) even if logged in as mentor
  const isStudentMode = searchParams.get('mode') === 'student';
  const isMentorOrAdmin = !isStudentMode && (studentShell.role === 'mentor' || studentShell.role === 'admin');

  const title = driveType === 'rekaman' ? 'Rekaman' : 'Materi';
  const description = driveType === 'rekaman'
    ? 'Akses seluruh rekaman yang telah disediakan.'
    : 'Akses seluruh materi pembelajaran yang telah disediakan.';

  return (
    <ProductShell
      brand={productShellMeta.brand}
      tierLabel={studentShell.tierLabel}
      navItems={studentShell.navItems}
    >
      <div className="flex flex-col gap-8 w-full py-4">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
              {driveType === 'rekaman' ? 'Video & Kelas' : 'Dokumen & Modul'}
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-3 text-foreground">
              {title}
            </h1>
            <p className="text-base text-muted-foreground mt-2 max-w-2xl">
              {description}
            </p>
          </div>
        </div>

        {/* Explorer Card Container */}
        <div className="w-full flex-1">
          <DriveExplorer driveType={driveType} isMentorOrAdmin={isMentorOrAdmin} />
        </div>
      </div>
    </ProductShell>
  );
}
