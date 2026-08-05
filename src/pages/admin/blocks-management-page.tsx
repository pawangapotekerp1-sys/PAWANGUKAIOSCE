import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, Edit2, Trash2, List } from "lucide-react";

import AdminShell from "../../components/layout/admin-shell";
import { Card } from "../../components/ui/card";
import Button from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { createAdminNavItems } from "../../mocks/admin-content";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

import {
  getAdminBlocks,
  createAdminBlock,
  updateAdminBlock,
  deleteAdminBlock,
  getAdminTopics,
  createAdminTopic,
  updateAdminTopic,
  deleteAdminTopic,
  type AdminBlock,
  type AdminTopic
} from "../../lib/api/admin-blocks-api";

const blockSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  slug: z.string().min(1, "Slug wajib diisi"),
  description: z.string().optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
  iconName: z.string().optional().nullable(),
  colorTheme: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});
type BlockFormData = z.infer<typeof blockSchema>;

const topicSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  slug: z.string().min(1, "Slug wajib diisi"),
  description: z.string().optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});
type TopicFormData = z.infer<typeof topicSchema>;

const ICON_OPTIONS = [
  { value: "", label: "Tidak Ada" },
  { value: "Stethoscope", label: "Stethoscope" },
  { value: "FlaskConical", label: "FlaskConical" },
  { value: "Scale", label: "Scale" },
  { value: "Layers", label: "Layers" },
];

const THEME_OPTIONS = [
  { value: "", label: "Default" },
  { value: "teal", label: "Teal" },
  { value: "indigo", label: "Indigo" },
  { value: "amber", label: "Amber" },
  { value: "slate", label: "Slate" },
  { value: "fuchsia", label: "Fuchsia" },
];

const inputClass = "min-h-11 w-full rounded-[1.15rem] border border-border bg-muted px-4 text-sm text-foreground outline-none transition focus:border-border";

function BlocksManagementPage() {
  const queryClient = useQueryClient();
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<AdminBlock | null>(null);

  const [topicsDialogOpenForBlock, setTopicsDialogOpenForBlock] = useState<AdminBlock | null>(null);
  
  const blocksQuery = useQuery({
    queryKey: ["admin-blocks"],
    queryFn: () => getAdminBlocks(),
  });
  const blocks = blocksQuery.data ?? [];

  const blockForm = useForm<BlockFormData>({
    resolver: zodResolver(blockSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      sortOrder: 0,
      iconName: "",
      colorTheme: "",
      isActive: true,
    }
  });

  useEffect(() => {
    if (editingBlock) {
      blockForm.reset({
        name: editingBlock.name,
        slug: editingBlock.slug,
        description: editingBlock.description ?? "",
        sortOrder: editingBlock.sortOrder,
        iconName: editingBlock.iconName ?? "",
        colorTheme: editingBlock.colorTheme ?? "",
        isActive: editingBlock.isActive,
      });
    } else {
      blockForm.reset({
        name: "",
        slug: "",
        description: "",
        sortOrder: 0,
        iconName: "",
        colorTheme: "",
        isActive: true,
      });
    }
  }, [editingBlock, blockForm]);

  const blockMutation = useMutation({
    mutationFn: (data: BlockFormData) => {
      if (editingBlock) {
        return updateAdminBlock(editingBlock.id, {
          name: data.name,
          slug: data.slug,
          description: data.description,
          sort_order: data.sortOrder,
          icon_name: data.iconName || null,
          color_theme: data.colorTheme || null,
          is_active: data.isActive,
        });
      }
      return createAdminBlock({
        name: data.name,
        slug: data.slug,
        description: data.description,
        sort_order: data.sortOrder,
        icon_name: data.iconName || null,
        color_theme: data.colorTheme || null,
        is_active: data.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blocks"] });
      setIsBlockDialogOpen(false);
      setEditingBlock(null);
    }
  });

  const deleteBlockMutation = useMutation({
    mutationFn: (id: string) => deleteAdminBlock(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blocks"] });
    }
  });

  const handleBlockSubmit = blockForm.handleSubmit((data) => {
    blockMutation.mutate(data);
  });

  function openCreateBlock() {
    setEditingBlock(null);
    setIsBlockDialogOpen(true);
  }

  function openEditBlock(block: AdminBlock) {
    setEditingBlock(block);
    setIsBlockDialogOpen(true);
  }

  return (
    <AdminShell
      title="Kelola Blocks & Topics"
      description="Kelola daftar block dan topik yang tersedia di aplikasi."
      navItems={createAdminNavItems("/admin/blocks")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Badge variant="default">Total {blocks.length} Blocks</Badge>
        </div>
        <Button variant="primary" onClick={openCreateBlock}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Blok
        </Button>
      </div>

      <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingBlock ? "Edit Blok" : "Tambah Blok Baru"}</DialogTitle>
            <DialogDescription>
              Isi form di bawah untuk {editingBlock ? "menyimpan perubahan blok" : "membuat blok baru"}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBlockSubmit} className="grid gap-4 mt-4">
            <label className="grid gap-2 text-sm font-medium">
              Nama Blok
              <input type="text" className={inputClass} {...blockForm.register("name")} />
              {blockForm.formState.errors.name && (
                <span className="text-destructive text-xs">{blockForm.formState.errors.name.message}</span>
              )}
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Slug
              <input type="text" className={inputClass} {...blockForm.register("slug")} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Deskripsi
              <textarea className={inputClass + " min-h-20 py-2"} {...blockForm.register("description")} />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="grid gap-2 text-sm font-medium">
                Sort Order
                <input type="number" className={inputClass} {...blockForm.register("sortOrder")} />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Status
                <select className={inputClass} {...blockForm.register("isActive", {
                  setValueAs: v => v === "true" || v === true
                })}>
                  <option value="true">Aktif</option>
                  <option value="false">Tidak Aktif</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="grid gap-2 text-sm font-medium">
                Icon
                <select className={inputClass} {...blockForm.register("iconName")}>
                  {ICON_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Tema Warna
                <select className={inputClass} {...blockForm.register("colorTheme")}>
                  {THEME_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsBlockDialogOpen(false)}>Batal</Button>
              <Button type="submit" variant="primary" loading={blockMutation.isPending}>Simpan</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <TopicsDialog 
        block={topicsDialogOpenForBlock} 
        onClose={() => setTopicsDialogOpenForBlock(null)} 
      />

      <Card className="mt-6 px-5 py-5">
        <h2 className="text-xl font-semibold mb-4">Daftar Blok</h2>
        
        {blocksQuery.isLoading ? (
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Memuat daftar blok...</p>
          </div>
        ) : blocksQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Gagal memuat blok</AlertTitle>
            <AlertDescription>Terjadi kesalahan saat memuat daftar blok.</AlertDescription>
          </Alert>
        ) : blocks.length === 0 ? (
          <Alert>
            <AlertTitle>Tidak ada blok</AlertTitle>
            <AlertDescription>Belum ada data blok yang dibuat.</AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4 mt-4">
            {blocks.map((block) => (
              <Card key={block.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{block.name}</h3>
                    {!block.isActive && <Badge variant="secondary">Tidak Aktif</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">/{block.slug}</p>
                  {block.description && (
                    <p className="text-sm mt-2">{block.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-3 text-xs font-medium text-muted-foreground">
                    <span>Order: {block.sortOrder}</span>
                    {block.iconName && <span>Icon: {block.iconName}</span>}
                    {block.colorTheme && <span>Warna: {block.colorTheme}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setTopicsDialogOpenForBlock(block)}>
                    <List className="h-4 w-4 mr-2" />
                    Kelola Materi
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => openEditBlock(block)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => {
                    if (confirm(`Yakin ingin menghapus blok ${block.name}?`)) {
                      deleteBlockMutation.mutate(block.id);
                    }
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </AdminShell>
  );
}

function TopicsDialog({ block, onClose }: { block: AdminBlock | null, onClose: () => void }) {
  const queryClient = useQueryClient();
  const [editingTopic, setEditingTopic] = useState<AdminTopic | null>(null);

  const topicsQuery = useQuery({
    queryKey: ["admin-topics", block?.id],
    queryFn: () => getAdminTopics(block!.id),
    enabled: !!block?.id,
  });
  const topics = topicsQuery.data ?? [];

  const topicForm = useForm<TopicFormData>({
    resolver: zodResolver(topicSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      sortOrder: 0,
      isActive: true,
    }
  });

  useEffect(() => {
    if (editingTopic) {
      topicForm.reset({
        name: editingTopic.name,
        slug: editingTopic.slug,
        description: editingTopic.description ?? "",
        sortOrder: editingTopic.sortOrder,
        isActive: editingTopic.isActive,
      });
    } else {
      topicForm.reset({
        name: "",
        slug: "",
        description: "",
        sortOrder: 0,
        isActive: true,
      });
    }
  }, [editingTopic, topicForm]);

  const topicMutation = useMutation({
    mutationFn: (data: TopicFormData) => {
      if (editingTopic) {
        return updateAdminTopic(editingTopic.id, {
          name: data.name,
          slug: data.slug,
          description: data.description,
          sort_order: data.sortOrder,
          is_active: data.isActive,
        });
      }
      return createAdminTopic({
        block_id: block!.id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        sort_order: data.sortOrder,
        is_active: data.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-topics", block?.id] });
      setEditingTopic(null);
    }
  });

  const deleteTopicMutation = useMutation({
    mutationFn: (id: string) => deleteAdminTopic(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-topics", block?.id] });
    }
  });

  const handleTopicSubmit = topicForm.handleSubmit((data) => {
    topicMutation.mutate(data);
  });

  return (
    <Dialog open={!!block} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kelola Materi untuk Blok {block?.name}</DialogTitle>
          <DialogDescription>
            Tambah, ubah, atau hapus topik materi dalam blok ini.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-[300px_1fr] gap-6 mt-4">
          <Card className="p-4 h-fit">
            <h3 className="font-medium text-sm mb-3">
              {editingTopic ? "Edit Topik" : "Tambah Topik Baru"}
            </h3>
            <form onSubmit={handleTopicSubmit} className="grid gap-3">
              <label className="grid gap-1.5 text-xs font-medium">
                Nama Topik
                <input type="text" className={inputClass} {...topicForm.register("name")} />
              </label>
              <label className="grid gap-1.5 text-xs font-medium">
                Slug
                <input type="text" className={inputClass} {...topicForm.register("slug")} />
              </label>
              <label className="grid gap-1.5 text-xs font-medium">
                Deskripsi
                <textarea className={inputClass + " min-h-16 py-2"} {...topicForm.register("description")} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1.5 text-xs font-medium">
                  Sort Order
                  <input type="number" className={inputClass} {...topicForm.register("sortOrder")} />
                </label>
                <label className="grid gap-1.5 text-xs font-medium">
                  Status
                  <select className={inputClass} {...topicForm.register("isActive", {
                    setValueAs: v => v === "true" || v === true
                  })}>
                    <option value="true">Aktif</option>
                    <option value="false">Tidak Aktif</option>
                  </select>
                </label>
              </div>
              <div className="mt-2 flex justify-end gap-2">
                {editingTopic && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingTopic(null)}>
                    Batal
                  </Button>
                )}
                <Button type="submit" variant="primary" size="sm" loading={topicMutation.isPending}>
                  {editingTopic ? "Update" : "Tambah"}
                </Button>
              </div>
            </form>
          </Card>

          <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2">
            {topicsQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : topics.length === 0 ? (
              <Alert>
                <AlertDescription>Belum ada topik di blok ini.</AlertDescription>
              </Alert>
            ) : (
              topics.map(topic => (
                <div key={topic.id} className="p-3 border rounded-[1.15rem] flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-medium text-sm">{topic.name}</h4>
                    <p className="text-xs text-muted-foreground">/{topic.slug}</p>
                    <div className="flex gap-2 mt-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      <span>Order: {topic.sortOrder}</span>
                      <span className={topic.isActive ? "text-green-600" : "text-destructive"}>
                        {topic.isActive ? "Aktif" : "Tidak Aktif"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditingTopic(topic)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => {
                      if (confirm(`Hapus topik ${topic.name}?`)) {
                        deleteTopicMutation.mutate(topic.id);
                      }
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BlocksManagementPage;
