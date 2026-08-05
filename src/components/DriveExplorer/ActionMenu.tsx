import React from 'react';
import { DotsThree, Trash, Copy, ArrowRight } from '@phosphor-icons/react';

interface ActionMenuProps<T> {
  item: T;
  isOpen: boolean;
  onToggle: () => void;
  onClone?: (item: T) => void;
  onMove?: (item: T) => void;
  onDelete?: (item: T) => void;
  menuHoverClass?: string;
}

export function ActionMenu<T>({ item, isOpen, onToggle, onClone, onMove, onDelete, menuHoverClass = 'hover:text-blue-600' }: ActionMenuProps<T>) {
  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
      >
        <DotsThree weight="bold" className="w-5 h-5" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-10 py-1"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {onClone && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(); onClone(item); }}
              className={`w-full flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 ${menuHoverClass}`}
            >
              <Copy className="w-4 h-4 mr-2" /> Clone
            </button>
          )}
          {onMove && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(); onMove(item); }}
              className={`w-full flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 ${menuHoverClass}`}
            >
              <ArrowRight className="w-4 h-4 mr-2" /> Move
            </button>
          )}
          {(onClone || onMove) && onDelete && (
            <div className="h-px bg-slate-100 my-1" />
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(); onDelete(item); }}
              className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash className="w-4 h-4 mr-2" /> Delete
            </button>
          )}
        </div>
      )}
    </>
  );
}
