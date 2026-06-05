'use client';

import type { ReactNode } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { StateHandler } from '@/shared/components/StateHandler';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyMessage?: string;
  sort?: { by: string; dir: 'asc' | 'desc' };
  onSortChange?: (by: string) => void;
}

function SortIcon({
  columnKey,
  sort,
}: {
  columnKey: string;
  sort?: { by: string; dir: 'asc' | 'desc' };
}) {
  if (!sort || sort.by !== columnKey) {
    return <ArrowUpDown className="ml-1 size-3 opacity-50" />;
  }
  if (sort.dir === 'asc') {
    return <ArrowUp className="ml-1 size-3" />;
  }
  return <ArrowDown className="ml-1 size-3" />;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  isError = false,
  onRetry,
  emptyMessage,
  sort,
  onSortChange,
}: DataTableProps<T>) {
  const isEmpty = !isLoading && !isError && data.length === 0;

  const skeletonRows = Array.from({ length: 5 });

  const skeleton = (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.key} className={col.className}>
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {skeletonRows.map((_, rowIdx) => (
          <TableRow key={rowIdx}>
            {columns.map((col) => (
              <TableCell key={col.key}>
                <div className="h-4 animate-pulse rounded bg-muted" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <StateHandler
      isLoading={isLoading}
      isError={isError}
      isEmpty={isEmpty}
      onRetry={onRetry}
      emptyMessage={emptyMessage}
      skeleton={skeleton}
    >
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(col.className, col.sortable && 'cursor-pointer select-none')}
                onClick={() => {
                  if (col.sortable && onSortChange) {
                    onSortChange(col.key);
                  }
                }}
              >
                <span className="inline-flex items-center">
                  {col.header}
                  {col.sortable && (
                    <SortIcon columnKey={col.key} sort={sort} />
                  )}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIdx) => (
            <TableRow key={rowIdx}>
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? '')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </StateHandler>
  );
}
