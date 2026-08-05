import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MaterialDriveType,
  MaterialFolder,
  MaterialLink,
  getFolders,
  getLinks,
  createFolder,
  createLink,
  deleteFolder,
  deleteLink,
  cloneItem,
  moveItem,
} from '@/lib/api/material-api';
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';
import { FolderItem } from './FolderItem';
import { LinkItem } from './LinkItem';
import { MediaPreviewModal } from './MediaPreviewModal';
import { FolderPlus, Link as LinkIcon, Spinner } from '@phosphor-icons/react';

// UI Components
import { toast } from 'sonner';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface DriveExplorerProps {
  driveType: 'rekaman' | 'ppt';
  isMentorOrAdmin: boolean;
}

export function DriveExplorer({ driveType, isMentorOrAdmin }: DriveExplorerProps) {
  const queryClient = useQueryClient();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [previewLink, setPreviewLink] = useState<MaterialLink | null>(null);

  // Modals state
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [isCreateLinkOpen, setIsCreateLinkOpen] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const [deleteFolderTarget, setDeleteFolderTarget] = useState<MaterialFolder | null>(null);
  const [deleteLinkTarget, setDeleteLinkTarget] = useState<MaterialLink | null>(null);

  const [moveItemTarget, setMoveItemTarget] = useState<{ id: string; type: 'folder' | 'link'; name: string } | null>(null);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string>('root');

  useEffect(() => {
    function handleClickOutside() {
      setActiveMenuId(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const apiType = driveType === 'rekaman' ? 'VIDEO' : 'PPT';

  // Fetch Folders
  const {
    data: folders = [],
    isLoading: isFoldersLoading,
    isError: isFoldersError,
    error: foldersError,
  } = useQuery({
    queryKey: ['material-folders', apiType, currentFolderId],
    queryFn: () => getFolders({ driveType: apiType, parentId: currentFolderId }),
  });

  // Fetch Links
  const {
    data: links = [],
    isLoading: isLinksLoading,
    isError: isLinksError,
    error: linksError,
  } = useQuery({
    queryKey: ['material-links', apiType, currentFolderId],
    queryFn: () => getLinks({ driveType: apiType, folderId: currentFolderId }),
  });

  // Fetch ALL Folders for Move Picker
  const { data: allFolders = [] } = useQuery({
    queryKey: ['material-folders-all', apiType],
    queryFn: () => getFolders({ driveType: apiType }),
    enabled: !!moveItemTarget,
  });

  const isLoading = isFoldersLoading || isLinksLoading;

  // Mutations
  const createFolderMutation = useMutation({
    mutationFn: (name: string) => createFolder({ name, driveType: apiType, parentId: currentFolderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-folders', apiType, currentFolderId] });
      toast.success('Folder created successfully');
    },
    onError: (err) => toast.error(`Failed to create folder: ${err instanceof Error ? err.message : 'Unknown error'}`),
  });

  const createLinkMutation = useMutation({
    mutationFn: (params: { title: string; url: string; embedUrl: string }) =>
      createLink({ ...params, driveType: apiType, folderId: currentFolderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-links', apiType, currentFolderId] });
      toast.success('Link added successfully');
    },
    onError: (err) => toast.error(`Failed to create link: ${err instanceof Error ? err.message : 'Unknown error'}`),
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => deleteFolder({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-folders', apiType, currentFolderId] });
      toast.success('Folder deleted successfully');
    },
    onError: (err) => toast.error(`Failed to delete folder: ${err instanceof Error ? err.message : 'Unknown error'}`),
  });

  const deleteLinkMutation = useMutation({
    mutationFn: (id: string) => deleteLink({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-links', apiType, currentFolderId] });
      toast.success('Link deleted successfully');
    },
    onError: (err) => toast.error(`Failed to delete link: ${err instanceof Error ? err.message : 'Unknown error'}`),
  });

  const cloneMutation = useMutation({
    mutationFn: (params: { id: string; type: 'folder' | 'link' }) =>
      cloneItem({ itemId: params.id, itemType: params.type, newParentId: currentFolderId, isRoot: currentFolderId === null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-folders', apiType, currentFolderId] });
      queryClient.invalidateQueries({ queryKey: ['material-links', apiType, currentFolderId] });
      toast.success('Item cloned successfully');
    },
    onError: (err) => toast.error(`Failed to clone item: ${err instanceof Error ? err.message : 'Unknown error'}`),
  });
  
  const moveMutation = useMutation({
    mutationFn: (params: { id: string; type: 'folder' | 'link', targetId: string | null }) =>
      moveItem({ itemId: params.id, itemType: params.type, newParentId: params.targetId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-folders', apiType, currentFolderId] });
      queryClient.invalidateQueries({ queryKey: ['material-links', apiType, currentFolderId] });
      toast.success('Item moved successfully');
    },
    onError: (err) => toast.error(`Failed to move item: ${err instanceof Error ? err.message : 'Unknown error'}`),
  });

  // Handlers
  const handleNavigate = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    if (folderId === null) {
      setBreadcrumbs([]);
    } else {
      const index = breadcrumbs.findIndex((b) => b.id === folderId);
      if (index !== -1) {
        setBreadcrumbs(breadcrumbs.slice(0, index + 1));
      }
    }
  };

  const handleFolderClick = (folder: MaterialFolder) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      createFolderMutation.mutate(newFolderName.trim());
      setIsCreateFolderOpen(false);
      setNewFolderName('');
    }
  };

  const handleCreateLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLinkTitle.trim() && newLinkUrl.trim()) {
      createLinkMutation.mutate({
        title: newLinkTitle.trim(),
        url: newLinkUrl.trim(),
        embedUrl: newLinkUrl.trim(),
      });
      setIsCreateLinkOpen(false);
      setNewLinkTitle('');
      setNewLinkUrl('');
    }
  };

  const handleMoveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (moveItemTarget) {
      const targetId = moveTargetFolderId === 'root' ? null : moveTargetFolderId;
      moveMutation.mutate({
        id: moveItemTarget.id,
        type: moveItemTarget.type,
        targetId,
      });
      setMoveItemTarget(null);
      setMoveTargetFolderId('root');
    }
  };

  const isEmpty = !isLoading && folders.length === 0 && links.length === 0;

  return (
    <div className="w-full p-4 md:p-6 bg-card rounded-2xl shadow-sm border border-border/80">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-800">
          {driveType === 'rekaman' ? 'Daftar Rekaman' : 'Daftar Materi'}
        </h2>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {isMentorOrAdmin && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setIsCreateFolderOpen(true)}
                className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 px-4 py-2 rounded-lg font-medium transition-colors border border-blue-200 cursor-pointer"
              >
                <FolderPlus weight="bold" className="w-5 h-5" />
                <span className="hidden sm:inline">New Folder</span>
              </button>
              <button
                onClick={() => setIsCreateLinkOpen(true)}
                className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 px-4 py-2 rounded-lg font-medium transition-colors border border-emerald-200 cursor-pointer"
              >
                <LinkIcon weight="bold" className="w-5 h-5" />
                <span className="hidden sm:inline">New Link</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <Breadcrumb items={breadcrumbs} onNavigate={handleNavigate} />

      <div className="min-h-[400px] relative rounded-xl border border-slate-100 bg-slate-50/50 p-4">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
            <Spinner className="w-8 h-8 animate-spin text-blue-500 mb-4" />
            <p className="font-medium text-slate-500">Loading files...</p>
          </div>
        ) : isFoldersError || isLinksError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
            <p className="font-medium text-red-500">Failed to load content.</p>
            <p className="text-sm text-slate-500">
              {foldersError instanceof Error ? foldersError.message : ''}
              {linksError instanceof Error ? linksError.message : ''}
            </p>
          </div>
        ) : isEmpty ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
              <FolderPlus weight="duotone" className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No items found</h3>
            <p className="text-slate-500 max-w-sm mb-6">
              This folder is empty. Create a new folder or add a link to get started.
            </p>
            {isMentorOrAdmin && (
              <div className="flex gap-3">
                <button
                  onClick={() => setIsCreateFolderOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium shadow-sm transition-colors cursor-pointer"
                >
                  Create Folder
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {folders.map((folder) => (
              <FolderItem
                key={folder.id}
                folder={folder}
                onClick={handleFolderClick}
                isMentorOrAdmin={isMentorOrAdmin}
                isOpen={activeMenuId === folder.id}
                onToggle={() => setActiveMenuId(activeMenuId === folder.id ? null : folder.id)}
                onClone={() => cloneMutation.mutate({ id: folder.id, type: 'folder' })}
                onDelete={() => setDeleteFolderTarget(folder)}
                onMove={() => setMoveItemTarget({ id: folder.id, type: 'folder', name: folder.name })}
              />
            ))}
            {links.map((link) => (
              <LinkItem
                key={link.id}
                link={link}
                isMentorOrAdmin={isMentorOrAdmin}
                isOpen={activeMenuId === link.id}
                onToggle={() => setActiveMenuId(activeMenuId === link.id ? null : link.id)}
                onSelect={(selectedLink) => setPreviewLink(selectedLink)}
                onClone={() => cloneMutation.mutate({ id: link.id, type: 'link' })}
                onDelete={() => setDeleteLinkTarget(link)}
                onMove={() => setMoveItemTarget({ id: link.id, type: 'link', name: link.title })}
              />
            ))}
          </div>
        )}
      </div>

      <MediaPreviewModal
        link={previewLink}
        onClose={() => setPreviewLink(null)}
      />

      {/* Delete Folder Confirm */}
      <ConfirmDialog
        open={!!deleteFolderTarget}
        onClose={() => setDeleteFolderTarget(null)}
        onConfirm={() => {
          if (deleteFolderTarget) deleteFolderMutation.mutate(deleteFolderTarget.id);
          setDeleteFolderTarget(null);
        }}
        title="Delete Folder"
        description={`Are you sure you want to delete folder "${deleteFolderTarget?.name}"? This will delete all contents inside it.`}
        confirmLabel="Delete"
        isPending={deleteFolderMutation.isPending}
      />

      {/* Delete Link Confirm */}
      <ConfirmDialog
        open={!!deleteLinkTarget}
        onClose={() => setDeleteLinkTarget(null)}
        onConfirm={() => {
          if (deleteLinkTarget) deleteLinkMutation.mutate(deleteLinkTarget.id);
          setDeleteLinkTarget(null);
        }}
        title="Delete Link"
        description={`Are you sure you want to delete link "${deleteLinkTarget?.title}"?`}
        confirmLabel="Delete"
        isPending={deleteLinkMutation.isPending}
      />

      {/* Create Folder Dialog */}
      <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
            <DialogDescription>Enter a name for the new folder.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateFolderSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="folder-name">Folder Name</Label>
                <Input
                  id="folder-name"
                  placeholder="e.g. Matematika Kelas 10"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateFolderOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!newFolderName.trim() || createFolderMutation.isPending}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Link Dialog */}
      <Dialog open={isCreateLinkOpen} onOpenChange={setIsCreateLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add External Link</DialogTitle>
            <DialogDescription>Add a link to Google Drive, YouTube, etc.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateLinkSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="link-title">Title</Label>
                <Input
                  id="link-title"
                  placeholder="e.g. Pembahasan Soal UN"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link-url">External Link URL (e.g., YouTube, GDrive)</Label>
                <Input
                  id="link-url"
                  placeholder="https://..."
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateLinkOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!newLinkTitle.trim() || !newLinkUrl.trim() || createLinkMutation.isPending}>
                Add Link
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Move Item Dialog */}
      <Dialog open={!!moveItemTarget} onOpenChange={(open) => !open && setMoveItemTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move {moveItemTarget?.type === 'folder' ? 'Folder' : 'Link'}</DialogTitle>
            <DialogDescription>
              Select a destination for <strong>{moveItemTarget?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMoveSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Destination Folder</Label>
                <Select value={moveTargetFolderId} onValueChange={(val) => setMoveTargetFolderId(val || 'root')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root">/ (Root)</SelectItem>
                    {allFolders
                      // Prevent moving folder into itself
                      .filter(f => f.id !== moveItemTarget?.id)
                      .map(f => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMoveItemTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={moveMutation.isPending}>
                Move
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
