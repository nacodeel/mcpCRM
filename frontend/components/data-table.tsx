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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3.5 px-4 sm:px-6 border-t border-border bg-surface-secondary/20 rounded-b-2xl text-[10px] font-bold text-text-secondary uppercase tracking-wider">
      {/* Summary Info */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <span className="font-semibold text-text-secondary tracking-normal lowercase first-letter:uppercase">
          Показано <strong className="font-bold text-text-primary">{startItem}–{endItem}</strong> из <strong className="font-bold text-text-primary">{totalCount}</strong>
        </span>

        {/* Page Size Selector */}
        <div className="flex items-center gap-1.5 ml-0 sm:ml-4 border-l sm:border-l border-border pl-0 sm:pl-4 normal-case tracking-normal">
          <span className="text-text-secondary">Показывать по:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-surface border border-border text-text-primary text-xs rounded-xl px-2.5 py-1 outline-none cursor-pointer hover:bg-surface-secondary transition-colors duration-150 font-bold"
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
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-2.5 py-1 text-xs border border-border/80 bg-surface text-text-secondary hover:bg-surface-secondary rounded-xl disabled:opacity-40 disabled:pointer-events-none transition-all duration-150 flex items-center justify-center h-8 w-8 active:scale-95"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((pageNum, idx) => (
            <React.Fragment key={idx}>
              {pageNum === '...' ? (
                <span className="px-2.5 py-1 text-text-secondary select-none tracking-normal">...</span>
              ) : (
                <button
                  onClick={() => onPageChange(Number(pageNum))}
                  className={cn(
                    'px-3.5 py-1 text-xs font-bold rounded-xl border transition-all duration-150 h-8 flex items-center justify-center active:scale-95 min-w-[32px]',
                    currentPage === pageNum
                      ? 'bg-accent border-transparent text-background shadow-sm shadow-accent/10'
                      : 'border-border/80 bg-surface text-text-secondary hover:bg-surface-secondary'
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
          className="px-2.5 py-1 text-xs border border-border/80 bg-surface text-text-secondary hover:bg-surface-secondary rounded-xl disabled:opacity-40 disabled:pointer-events-none transition-all duration-150 flex items-center justify-center h-8 w-8 active:scale-95"
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
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-border rounded-2xl bg-surface shadow-sm">
      <div className="w-12 h-12 bg-surface-secondary border border-border rounded-2xl flex items-center justify-center text-text-secondary mb-4 animate-fade-in">
        <Inbox className="w-5 h-5 stroke-[1.5]" />
      </div>
      <h3 className="text-sm font-bold text-text-primary tracking-tight">{title}</h3>
      <p className="mt-1.5 text-xs text-text-secondary max-w-sm leading-relaxed font-medium">{description}</p>
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
    <div className="w-full overflow-hidden border border-border rounded-2xl bg-surface shadow-sm">
      <div className="w-full overflow-x-auto min-h-[140px] relative scrollbar-none">
        <table className="w-full border-collapse text-left text-sm table-auto">
          <thead>
            <tr className="border-b border-border bg-surface-secondary/40 text-[10px] font-bold tracking-wider text-text-secondary uppercase select-none">
              {columns.map((col) => {
                const isSorted = sortField === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && onSort && onSort(col.key)}
                    style={{ width: col.width }}
                    className={cn(
                      'px-5 py-3.5 font-bold text-text-secondary hover:text-text-primary transition-colors',
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
                            isSorted ? 'text-text-primary stroke-[2.5]' : 'text-text-secondary/40'
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
                <tr key={rIdx} className="border-b border-border last:border-b-0">
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="px-5 py-4">
                      <div className="h-3.5 bg-surface-secondary rounded animate-pulse" style={{ width: cIdx === 0 ? '60%' : '80%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // NO ROWS EMPTY CELL
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-xs text-text-secondary bg-surface font-medium">
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
                    'border-b border-border last:border-b-0 hover:bg-surface-secondary/40 active:bg-surface-secondary/80 transition-all duration-150 group select-none',
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
                          'px-5 py-4 text-text-primary text-xs font-semibold transition-colors',
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
