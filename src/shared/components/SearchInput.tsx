'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/shared/hooks/useDebounce';

interface SearchInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value = '',
  onChange,
  placeholder = 'Pesquisar...',
  className,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  // Sincroniza com mudancas externas de `value` (ex.: limpar filtros) durante o
  // render — padrao "ajustar estado quando um prop muda", sem useEffect, evitando
  // o cascading-render sinalizado pela regra react-hooks/set-state-in-effect.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setLocalValue(value);
  }

  const debouncedValue = useDebounce(localValue, 400);

  useEffect(() => {
    onChange(debouncedValue);
    // onChange is intentionally excluded from deps to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue]);

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}
