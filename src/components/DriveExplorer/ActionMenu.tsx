import React from 'react';
import { DotsThree, Trash, Copy, ArrowRight, Eye, CaretRight } from '@phosphor-icons/react';

interface ActionMenuProps<T> {
  item: T;
  isOpen: boolean;
  onToggle: () => void;
  onClone?: (item: T) => void;
  onMove?: (item: T) => void;
  onDelete?: (item: T) => void;
  onVisibilityChange?: (item: T, newVisibleTo: string[]) => void;
  currentVisibleTo?: string[];
  menuHoverClass?: string;
}

export function ActionMenu<T>({ item, isOpen, onToggle, onClone, onMove, onDelete, onVisibilityChange, currentVisibleTo = ['pro', 'osce_pro'], menuHoverClass = 'hover:text-blue-600' }: ActionMenuProps<T>) {
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
          className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-10 py-1"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {onVisibilityChange && (
            <div className="relative group/visibility">
              <button
                className={`w-full flex items-center justify-between px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 ${menuHoverClass}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center">
                  <Eye className="w-4 h-4 mr-2" /> Munculkan untuk
                </div>
                <CaretRight className="w-4 h-4 text-slate-400" />
              </button>
              <div className="absolute right-full top-0 mr-1 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-20 py-1 hidden group-hover/visibility:block">
                {[
                  { value: 'pro', label: 'Kelas Apoteker' },
                  { value: 'osce_pro', label: 'Kelas OSCE' }
                ].map((role) => {
                  const isChecked = currentVisibleTo.includes(role.value);
                  return (
                    <label key={role.value} className="w-full flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="mr-3 cursor-pointer" 
                        checked={isChecked}
                        onChange={(e) => {
                          let newVisibleTo = [...currentVisibleTo];
                          if (e.target.checked) {
                            if (!newVisibleTo.includes(role.value)) {
                              newVisibleTo.push(role.value);
                            }
                          } else {
                            newVisibleTo = newVisibleTo.filter(v => v !== role.value);
                          }
                          onVisibilityChange(item, newVisibleTo);
                        }}
                      />
                      {role.label}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
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
          {(onClone || onMove || onVisibilityChange) && onDelete && (
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
