import React from 'react';
import { Folder } from '@phosphor-icons/react';
import { MaterialFolder } from '@/lib/api/material-api';
import { ActionMenu } from './ActionMenu';

interface FolderItemProps {
  folder: MaterialFolder;
  onClick: (folder: MaterialFolder) => void;
  isMentorOrAdmin: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onClone?: (folder: MaterialFolder) => void;
  onMove?: (folder: MaterialFolder) => void;
  onDelete?: (folder: MaterialFolder) => void;
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
}: FolderItemProps) {
  return (
    <div className="relative group">
      <div
        onClick={() => onClick(folder)}
        className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md hover:bg-blue-50/50 transition-all cursor-pointer bg-white"
      >
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600 flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Folder weight="fill" className="w-6 h-6" />
          </div>
          <span className="font-medium text-slate-700 truncate group-hover:text-blue-900 transition-colors">
            {folder.name}
          </span>
        </div>

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
