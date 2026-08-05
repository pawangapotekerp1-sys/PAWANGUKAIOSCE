import React from 'react';
import { CaretRight, House } from '@phosphor-icons/react';

export interface BreadcrumbItem {
  id: string | null; // null for Root
  name: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate: (id: string | null) => void;
}

export function Breadcrumb({ items, onNavigate }: BreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-slate-500 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100 shadow-sm">
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center hover:text-blue-600 transition-colors p-1 rounded hover:bg-slate-200"
        title="Root Folder"
      >
        <House weight="fill" className="w-4 h-4 mr-1" />
        <span className="font-medium">Home</span>
      </button>

      {items.length > 0 && (
        <CaretRight weight="bold" className="w-3 h-3 text-slate-300" />
      )}

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={item.id ?? 'root'}>
            <button
              onClick={() => onNavigate(item.id)}
              className={`px-2 py-1 rounded transition-colors truncate max-w-[150px] ${
                isLast
                  ? 'text-slate-800 font-semibold bg-white shadow-sm border border-slate-200'
                  : 'hover:text-blue-600 hover:bg-slate-200 font-medium'
              }`}
            >
              {item.name}
            </button>
            {!isLast && (
              <CaretRight weight="bold" className="w-3 h-3 text-slate-300 flex-shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
