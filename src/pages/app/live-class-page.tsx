import React, { useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ProductShell from "../../components/layout/product-shell";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";
import {
  getLiveClasses,
  createLiveClass,
  updateLiveClass,
  deleteLiveClass,
  type LiveClass,
  type LiveClassPayload,
} from "../../lib/api/live-class-api";
import { StudentLiveClassView } from "../../components/live-class/student-live-class-view";
import { MentorLiveClassView } from "../../components/live-class/mentor-live-class-view";
import { LiveClassFormModal } from "../../components/live-class/live-class-form-modal";
import ConfirmDialog from "../../components/ui/confirm-dialog";

export default function LiveClassPage() {
  const [searchParams] = useSearchParams();
  const currentHref = "/app/live-class";
  const studentShell = useStudentShell(currentHref);
  const queryClient = useQueryClient();

  const isStudentMode = searchParams.get("mode") === "student";
  const isMentorOrAdmin = !isStudentMode && (studentShell.role === "mentor" || studentShell.role === "admin");

  // State for Mentor Modal Form & Confirm Dialog
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LiveClass | null>(null);
  const [deletingItem, setDeletingItem] = useState<LiveClass | null>(null);

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["live-classes", studentShell.role],
    queryFn: () => getLiveClasses(studentShell.role),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: LiveClassPayload) => {
      if (editingItem) {
        return updateLiveClass(editingItem.id, payload);
      }
      return createLiveClass(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-classes"] });
      setIsModalOpen(false);
      setEditingItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteLiveClass(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-classes"] });
      setDeletingItem(null);
    },
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: LiveClass) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deletingItem) {
      await deleteMutation.mutateAsync(deletingItem.id);
    }
  };

  return (
    <ProductShell
      brand={productShellMeta.brand}
      tierLabel={studentShell.tierLabel}
      navItems={studentShell.navItems}
    >
      <div className="flex flex-col gap-6 w-full py-4">
        {isMentorOrAdmin ? (
          <MentorLiveClassView
            classes={classes}
            isLoading={isLoading}
            onAdd={handleOpenAdd}
            onEdit={handleOpenEdit}
            onDelete={(item) => setDeletingItem(item)}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Jadwal Live Class</h1>
              <p className="text-sm text-slate-500 mt-1">
                Jadwal sesi kelas online tatap muka interaktif bersama mentor via Zoom.
              </p>
            </div>
            <StudentLiveClassView classes={classes} isLoading={isLoading} />
          </div>
        )}
      </div>

      {/* Modal Tambah / Edit */}
      {isMentorOrAdmin && (
        <LiveClassFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingItem(null);
          }}
          onSave={async (payload) => {
            await saveMutation.mutateAsync(payload);
          }}
          initialData={editingItem}
          isSubmitting={saveMutation.isPending}
        />
      )}

      {/* Dialog Konfirmasi Hapus */}
      <ConfirmDialog
        open={Boolean(deletingItem)}
        title="Hapus Jadwal Live Class"
        description={`Apakah Anda yakin ingin menghapus jadwal "${deletingItem?.title}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus Jadwal"
        pendingLabel="Menghapus..."
        isPending={deleteMutation.isPending}
        cancelLabel="Batal"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingItem(null)}
      />
    </ProductShell>
  );
}
