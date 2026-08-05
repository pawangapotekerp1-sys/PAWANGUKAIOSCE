import React from 'react';
import { Link as LinkIcon, VideoCamera, FilePpt } from '@phosphor-icons/react';
import { MaterialLink } from '@/lib/api/material-api';
import { ActionMenu } from './ActionMenu';

interface LinkItemProps {
  link: MaterialLink;
  isMentorOrAdmin: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onSelect?: (link: MaterialLink) => void;
  onClone?: (link: MaterialLink) => void;
  onMove?: (link: MaterialLink) => void;
  onDelete?: (link: MaterialLink) => void;
}

export function LinkItem({
  link,
  isMentorOrAdmin,
  isOpen,
  onToggle,
  onSelect,
  onClone,
  onMove,
  onDelete,
}: LinkItemProps) {
  const handleClick = () => {
    if (onSelect) {
      onSelect(link);
    } else {
      window.open(link.url, '_blank', 'noopener,noreferrer');
    }
  };

  const IconComponent = link.drive_type === 'VIDEO' ? VideoCamera : link.drive_type === 'PPT' ? FilePpt : LinkIcon;

  return (
    <div className="relative group">
      <div
        onClick={handleClick}
        className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-md hover:bg-emerald-50/50 transition-all cursor-pointer bg-white"
      >
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className={`p-2 rounded-lg flex-shrink-0 transition-colors ${
            link.drive_type === 'VIDEO' 
              ? 'bg-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white'
              : link.drive_type === 'PPT'
              ? 'bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white'
              : 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'
          }`}>
            <IconComponent weight="fill" className="w-6 h-6" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-medium text-slate-700 truncate group-hover:text-slate-900 transition-colors">
              {link.title}
            </span>
          </div>
        </div>

        {isMentorOrAdmin && (
          <ActionMenu
            item={link}
            isOpen={isOpen}
            onToggle={onToggle}
            onClone={onClone}
            onMove={onMove}
            onDelete={onDelete}
            menuHoverClass="hover:text-emerald-600"
          />
        )}
      </div>
    </div>
  );
}
