import React from 'react';
import { Folder } from '@phosphor-icons/react';
import { MaterialFolder } from '@/lib/api/material-api';
import { ActionMenu } from './ActionMenu';
import { formatDateId } from '@/lib/utils';

interface FolderItemProps {
  folder: MaterialFolder;
  onClick: (folder: MaterialFolder) => void;
  isMentorOrAdmin: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onClone?: (folder: MaterialFolder) => void;
  onMove?: (folder: MaterialFolder) => void;
  onDelete?: (folder: MaterialFolder) => void;
  isListView?: boolean;
}

export function FolderItem({
  folder,
  onClick,
  isMentorOrAdmin,
  isOpen,
  onToggle,
  onClone,
  onMove,
  onDelete,
  isListView,
}: FolderItemProps) {
  return (
    <div className="relative group">
      <div
        onClick={() => onClick(folder)}
        className={`flex items-center justify-between p-3 border border-slate-200 hover:border-blue-300 hover:shadow-md hover:bg-blue-50/50 transition-all cursor-pointer bg-white ${isListView ? 'rounded-lg' : 'rounded-xl'}`}
      >
        <div className="flex items-center space-x-3 overflow-hidden flex-1">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600 flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Folder weight="fill" className="w-6 h-6" />
          </div>
          <span className={`font-medium text-slate-700 group-hover:text-blue-900 transition-colors ${isListView ? 'break-words whitespace-normal' : 'truncate'}`}>
            {folder.name}
          </span>
        </div>

        {isListView && (
          <div className="hidden md:flex items-center text-sm text-slate-500 mr-4 w-32 justify-end flex-shrink-0">
            {formatDateId(folder.created_at)}
          </div>
        )}

        {isMentorOrAdmin && (
          <ActionMenu
            item={folder}
            isOpen={isOpen}
            onToggle={onToggle}
            onClone={onClone}
            onMove={onMove}
            onDelete={onDelete}
            menuHoverClass="hover:text-blue-600"
          />
        )}
      </div>
    </div>
  );
}
