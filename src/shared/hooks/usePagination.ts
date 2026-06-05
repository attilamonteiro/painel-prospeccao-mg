'use client';

import { useCallback, useState } from 'react';
import { DEFAULT_PAGE_SIZE, type OrderDir, type PageSize } from '@/shared/lib/constants';

export interface PaginationState {
  page: number;
  pageSize: PageSize;
  orderBy: string;
  orderDir: OrderDir;
}

export interface PaginationActions {
  setPage: (page: number) => void;
  setPageSize: (size: PageSize) => void;
  setOrderBy: (col: string) => void;
  setOrderDir: (dir: OrderDir) => void;
  /** Inverte a direção caso a coluna já esteja selecionada; caso contrário seleciona a nova coluna com 'asc' */
  toggleSort: (col: string) => void;
  /** Volta para a página 1 mantendo os demais estados */
  resetPage: () => void;
  /** Restaura todos os campos ao estado inicial */
  reset: () => void;
}

export type UsePaginationResult = PaginationState & PaginationActions;

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: PageSize;
  initialOrderBy?: string;
  initialOrderDir?: OrderDir;
}

/**
 * Gerencia estado de paginação e ordenação para tabelas server-side.
 */
export function usePagination({
  initialPage = 1,
  initialPageSize = DEFAULT_PAGE_SIZE,
  initialOrderBy = '',
  initialOrderDir = 'asc',
}: UsePaginationOptions = {}): UsePaginationResult {
  const [page, setPageState] = useState<number>(initialPage);
  const [pageSize, setPageSizeState] = useState<PageSize>(initialPageSize);
  const [orderBy, setOrderByState] = useState<string>(initialOrderBy);
  const [orderDir, setOrderDirState] = useState<OrderDir>(initialOrderDir);

  const setPage = useCallback((p: number) => {
    setPageState(p);
  }, []);

  const setPageSize = useCallback((size: PageSize) => {
    setPageSizeState(size);
    setPageState(1); // volta para a primeira página ao mudar o tamanho
  }, []);

  const setOrderBy = useCallback((col: string) => {
    setOrderByState(col);
    setPageState(1);
  }, []);

  const setOrderDir = useCallback((dir: OrderDir) => {
    setOrderDirState(dir);
    setPageState(1);
  }, []);

  const toggleSort = useCallback(
    (col: string) => {
      if (col === orderBy) {
        setOrderDirState((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setOrderByState(col);
        setOrderDirState('asc');
      }
      setPageState(1);
    },
    [orderBy],
  );

  const resetPage = useCallback(() => {
    setPageState(1);
  }, []);

  const reset = useCallback(() => {
    setPageState(initialPage);
    setPageSizeState(initialPageSize);
    setOrderByState(initialOrderBy);
    setOrderDirState(initialOrderDir);
  }, [initialPage, initialPageSize, initialOrderBy, initialOrderDir]);

  return {
    page,
    pageSize,
    orderBy,
    orderDir,
    setPage,
    setPageSize,
    setOrderBy,
    setOrderDir,
    toggleSort,
    resetPage,
    reset,
  };
}
