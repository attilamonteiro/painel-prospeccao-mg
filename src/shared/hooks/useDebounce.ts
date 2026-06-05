'use client';

import { useEffect, useState } from 'react';

/**
 * Retorna o valor com atraso (debounce).
 *
 * @param value - Valor a ser "debounced"
 * @param delay - Atraso em ms (padrão: 400ms)
 */
export function useDebounce<T>(value: T, delay: number = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
