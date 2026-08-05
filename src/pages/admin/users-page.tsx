import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Loader2 } from "lucide-react";

import { type FormEvent, useEffect, useState } from "react";
import AdminShell from "../../components/layout/admin-shell";
import Button from "../../components/ui/button";



import {
  createManagedUser,
  listManagedUsers,
  updateManagedUserRole,
  type ManagedUser,
} from "../../lib/api/admin-api";
import { adminShellMeta, createAdminNavItems } from "../../mocks/admin-content";

type UserFilter = "all" | ManagedUser["filterLabel"];
type ManagedRole = ManagedUser["role"];

const FILTERS: Array<{
  id: UserFilter;
  label: string;
}> = [
  { id: "all", label: "Semua" },
  { id: "user_aktif", label: "Aktif" },
  { id: "belum_bayar", label: "Belum bayar" },
  { id: "admin", label: "Admin" },
];

function resolveRoleLabel(role: ManagedRole) {
  if (role === "admin") {
    return "Admin";
  }

  if (role === "mentor") {
    return "Mentor";
  }

  if (role === "pro") {
    return "Pro";
  }

  return "Peserta baru";
}

function formatCreatedAt(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function UsersPage() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<UserFilter>("all");
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [initialRole, setInitialRole] = useState<ManagedRole>("pendaftar_baru");
  const [rowRoles, setRowRoles] = useState<Record<string, ManagedRole>>({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ["admin-managed-users"],
    queryFn: () => listManagedUsers(),
  });
  const users = usersQuery.data ?? [];

  useEffect(() => {
    if (users.length === 0) {
      return;
    }

    setRowRoles((current) => {
      const nextRoles = { ...current };

      for (const item of users) {
        if (!nextRoles[item.id]) {
          nextRoles[item.id] = item.role;
        }
      }

      return nextRoles;
    });
  }, [users]);

  const createUserMutation = useMutation({
    mutationFn: (input: Parameters<typeof createManagedUser>[0]) => createManagedUser(input),
    onSuccess: async () => {
      setActionError(null);
      setActionMessage("Akun dibuat. Email untuk membuat kata sandi sudah dikirim.");
      setEmail("");
      setFullName("");
      setInitialRole("pendaftar_baru");
      setIsCreateFormOpen(false);
      await queryClient.invalidateQueries({
        queryKey: ["admin-managed-users"],
      });
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(
        error instanceof Error
          ? error.message
          : "Akun baru belum berhasil dibuat.",
      );
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: (input: Parameters<typeof updateManagedUserRole>[0]) => updateManagedUserRole(input),
    onSuccess: async () => {
      setActionError(null);
      setActionMessage("Peran pengguna berhasil diperbarui.");
      await queryClient.invalidateQueries({
        queryKey: ["admin-managed-users"],
      });
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(
        error instanceof Error
          ? error.message
          : "Perubahan peran belum berhasil disimpan.",
      );
    },
  });

  const summary = {
    admins: users.filter((item) => item.role === "admin").length,
    activeUsers: users.filter((item) => item.filterLabel === "user_aktif").length,
    unpaidUsers: users.filter((item) => item.filterLabel === "belum_bayar").length,
  };
  const filteredUsers = users.filter((item) =>
    activeFilter === "all" ? true : item.filterLabel === activeFilter,
  );

  function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionMessage(null);
    setActionError(null);

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setActionError("Email wajib diisi sebelum akun dibuat.");
      return;
    }

    createUserMutation.mutate({
      email: normalizedEmail,
      fullName: fullName.trim() || undefined,
      role: initialRole,
    });
  }

  function handleSaveRole(userId: string) {
    const nextRole = rowRoles[userId];

    if (!nextRole) {
      return;
    }

    setActionMessage(null);
    setActionError(null);
    updateRoleMutation.mutate({
      userId,
      role: nextRole,
    });
  }

  return (
    <AdminShell
      title="Kelola pengguna"
      description="Pantau pengguna aktif, cek yang belum bayar, dan buat akun baru."
      navItems={createAdminNavItems("/admin/users")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Badge variant="default">Aktif {summary.activeUsers}</Badge>
          <Badge variant="secondary">Belum bayar {summary.unpaidUsers}</Badge>
          <Badge variant="default">Admin {summary.admins}</Badge>
        </div>
        <Button
          onClick={() => setIsCreateFormOpen((current) => !current)}
          variant="primary"
        >
          {isCreateFormOpen ? "Tutup form" : "Buka form akun"}
        </Button>
      </div>

      {actionMessage ? (
        <div className="mt-6 rounded-[1.2rem] bg-muted px-4 py-3 text-sm font-medium text-foreground">
          {actionMessage}
        </div>
      ) : null}
      {actionError ? (
        <div className="mt-6 rounded-[1.2rem] bg-muted px-4 py-3 text-sm font-medium text-foreground">
          {actionError}
        </div>
      ) : null}

      {isCreateFormOpen ? (
        <Card className="mt-6 px-5 py-5" >
          <h2 className="text-2xl font-semibold text-foreground">Buat akun baru</h2>
          <p className="mt-2 text-sm leading-6 text-foreground">
            Pengguna akan menerima email untuk membuat kata sandi.
          </p>
          <form className="mt-5 grid gap-4 xl:grid-cols-2" onSubmit={handleCreateUser}>
            <label className="grid gap-2 text-sm font-medium text-foreground">
              Email
              <input
                className="min-h-11 rounded-[1.15rem] border border-border bg-muted px-4 text-sm text-foreground outline-none transition focus:border-border"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-foreground">
              Nama
              <input
                className="min-h-11 rounded-[1.15rem] border border-border bg-muted px-4 text-sm text-foreground outline-none transition focus:border-border"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-foreground">
              Peran awal
              <select
                className="min-h-11 rounded-[1.15rem] border border-border bg-muted px-4 text-sm text-foreground outline-none transition focus:border-border"
                value={initialRole}
                onChange={(event) => setInitialRole(event.target.value as ManagedRole)}
              >
                <option value="pendaftar_baru">Peserta baru</option>
                <option value="pro">Pro</option>
                <option value="mentor">Mentor</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <div className="xl:col-span-2">
              <Button
                loading={createUserMutation.isPending}
                loadingLabel="Membuat akun..."
                type="submit"
                variant="primary"
              >
                Buat akun
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card className="mt-6 px-5 py-5" >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Daftar pengguna</h2>
            <p className="mt-2 text-sm leading-6 text-foreground">
              Saring pengguna lalu ubah perannya langsung dari daftar ini.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <Button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                size="sm"
                variant={activeFilter === filter.id ? "secondary" : "outline"}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {usersQuery.isLoading ? (
          <div className="mt-6 flex flex-col items-center justify-center p-8 space-y-4">
  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  <p className="text-sm text-muted-foreground">Daftar pengguna sedang dimuat.</p>
</div>
        ) : usersQuery.isError ? (
          <Alert variant="destructive" className="mt-6">
  <AlertTitle>Daftar pengguna belum tersedia</AlertTitle>
  <AlertDescription>Daftar pengguna belum bisa dimuat.</AlertDescription>
</Alert>
        ) : filteredUsers.length === 0 ? (
          <Alert className="mt-6">
  <AlertTitle>Tidak ada pengguna di filter ini</AlertTitle>
  <AlertDescription>Belum ada pengguna yang cocok dengan filter aktif saat ini.</AlertDescription>
</Alert>
        ) : (
          <div className="mt-6 space-y-3">
            {filteredUsers.map((item) => {
              const identifier = item.email ?? item.id;

              return (
                <Card key={item.id} className="px-5 py-5" >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        {item.fullName ?? "Tanpa nama"}
                      </p>
                      <p className="mt-1 text-sm text-foreground">{item.email ?? "-"}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
                        Dibuat {formatCreatedAt(item.createdAt)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant={item.role === "admin" ? "default" : item.role === "pendaftar_baru" ? "secondary" : "default"}>
                          {resolveRoleLabel(item.role)}
                        </Badge>
                        {item.leaderboardAlias ? (
                          <Badge variant="default">{item.leaderboardAlias}</Badge>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:min-w-72">
                      <label className="grid gap-2 text-sm font-medium text-foreground">
                        <span className="sr-only">{`peran-${identifier}`}</span>
                        <select
                          aria-label={`peran-${identifier}`}
                          className="min-h-11 rounded-[1.15rem] border border-border bg-muted px-4 text-sm text-foreground outline-none transition focus:border-border"
                          value={rowRoles[item.id] ?? item.role}
                          onChange={(event) =>
                            setRowRoles((current) => ({
                              ...current,
                              [item.id]: event.target.value as ManagedRole,
                            }))}
                        >
                          <option value="pendaftar_baru">Peserta baru</option>
                          <option value="pro">Pro</option>
                          <option value="mentor">Mentor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </label>
                      <Button
                        aria-label={`simpan peran-${identifier}`}
                        loading={updateRoleMutation.isPending}
                        loadingLabel="Menyimpan..."
                        onClick={() => handleSaveRole(item.id)}
                        variant="primary"
                      >
                        Simpan peran
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>
    </AdminShell>
  );
}

export default UsersPage;
