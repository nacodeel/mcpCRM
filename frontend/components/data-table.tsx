'use client';

import * as React from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight, Inbox, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';

// COLUMN DEFINITION TYPE
export interface Column<T> {
  key: string;
  header: React.ReactNode;
  sortable?: boolean;
  render?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

// PAGINATION PROPS
export interface PaginationProps {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

// EMPTY STATE PROPS
export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

// PAGINATION COMPONENT
export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  // Generate page list
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 sm:px-6 border-t border-[#EDEDED] bg-[#F9F9F8] rounded-b-lg text-xs font-normal text-[#666666]">
      {/* Summary Info */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <span className="font-normal text-[#666666]">
          Показано <strong className="font-semibold text-[#1A1A1A]">{startItem}–{endItem}</strong> из <strong className="font-semibold text-[#1A1A1A]">{totalCount}</strong>
        </span>

        {/* Page Size Selector */}
        <div className="flex items-center gap-1.5 ml-0 sm:ml-4 border-l sm:border-l border-[#EDEDED] pl-0 sm:pl-4">
          <span className="text-[#666666]">Показывать по:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-transparent border border-[#EDEDED] text-[#1A1A1A] text-xs rounded px-1.5 py-0.5 outline-none cursor-pointer hover:bg-neutral-100 transition-colors duration-150 font-medium"
          >
            {[20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Page Controls Map */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-2 py-1 text-xs border border-[#EDEDED] bg-white text-[#666666] hover:bg-gray-100 rounded disabled:opacity-40 disabled:pointer-events-none transition-colors duration-150 flex items-center justify-center h-7"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((pageNum, idx) => (
            <React.Fragment key={idx}>
              {pageNum === '...' ? (
                <span className="px-2 py-1 text-[#666666] select-none">...</span>
              ) : (
                <button
                  onClick={() => onPageChange(Number(pageNum))}
                  className={cn(
                    'px-3 py-1 text-xs font-semibold rounded border transition-colors duration-150 h-7 flex items-center justify-center',
                    currentPage === pageNum
                      ? 'bg-[#1A1A1A] border-[#EDEDED] text-white'
                      : 'border-[#EDEDED] bg-white text-[#666666] hover:bg-gray-100'
                  )}
                >
                  {pageNum}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-2 py-1 text-xs border border-[#EDEDED] bg-white text-[#666666] hover:bg-gray-100 rounded disabled:opacity-40 disabled:pointer-events-none transition-colors duration-150 flex items-center justify-center h-7"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// EMPTY STATE COMPONENT
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-neutral-150 rounded-xl bg-white">
      <div className="w-12 h-12 bg-neutral-50 border border-neutral-150 rounded-full flex items-center justify-center text-neutral-400 mb-4 animate-fade-in">
        <Inbox className="w-5 h-5 stroke-[1.5]" />
      </div>
      <h3 className="text-sm font-semibold text-neutral-800">{title}</h3>
      <p className="mt-1.5 text-xs text-neutral-400 max-w-sm leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button size="sm" variant="primary" className="mt-5" onClick={onAction}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

// GENERIC DATABASE TABLE COMPONENT
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  onRowClick?: (item: T) => void;
  loading?: boolean;
}

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  sortField,
  sortDirection,
  onSort,
  onRowClick,
  loading,
}: DataTableProps<T>) {
  return (
    <div className="w-full overflow-hidden border border-[#EDEDED] rounded-lg bg-white shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
      <div className="w-full overflow-x-auto min-h-[140px] relative">
        <table className="w-full border-collapse text-left text-sm table-auto">
          <thead>
            <tr className="border-b border-[#EDEDED] bg-[#F9F9F8] text-[11px] font-semibold tracking-wider text-[#666666] uppercase select-none">
              {columns.map((col) => {
                const isSorted = sortField === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && onSort && onSort(col.key)}
                    style={{ width: col.width }}
                    className={cn(
                      'px-5 py-3 font-semibold text-[#666666] hover:text-[#1A1A1A] transition-colors',
                      col.sortable ? 'cursor-pointer' : '',
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center gap-1.5',
                        col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'
                      )}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <ArrowUpDown
                          className={cn(
                            'w-3 h-3 transition-colors duration-150',
                            isSorted ? 'text-[#1A1A1A] stroke-[2.5]' : 'text-neutral-300'
                          )}
                        />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // SKELETON ROW SIMULATIONS
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} className="border-b border-[#EDEDED]">
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="px-5 py-4">
                      <div className="h-3.5 bg-neutral-100/80 rounded animate-pulse" style={{ width: cIdx === 0 ? '60%' : '80%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // NO ROWS EMPTY CELL
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-xs text-[#666666] bg-white">
                  Нет данных для отображения. Измените параметры поиска или фильтров.
                </td>
              </tr>
            ) : (
              // ROWS RENDER Map
              data.map((item, index) => (
                <tr
                  key={item.id}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={cn(
                    'border-b border-[#EDEDED] hover:bg-[#F9F9F8] active:bg-[#F5F5F4] transition-all duration-100 group select-none',
                    onRowClick ? 'cursor-pointer' : ''
                  )}
                >
                  {columns.map((col) => {
                    const alignClass =
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          'px-5 py-3.5 text-[#1A1A1A] text-sm font-normal transition-colors',
                          alignClass
                        )}
                      >
                        {col.render ? col.render(item, index) : (item as any)[col.key]}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
