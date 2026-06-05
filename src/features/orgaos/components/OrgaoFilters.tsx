'use client';

import { SearchInput } from '@/shared/components/SearchInput';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFilterOptions } from '../hooks/useFilterOptions';
import type { OrgaoFilters } from '@/shared/types/orgao';

type PartialFilters = Omit<
  OrgaoFilters,
  'p_page' | 'p_page_size' | 'p_order_by' | 'p_order_dir'
>;

interface OrgaoFiltersProps {
  filters: PartialFilters;
  onChange: (filters: PartialFilters) => void;
}

export function OrgaoFiltersPanel({ filters, onChange }: OrgaoFiltersProps) {
  const { data: options, isLoading, isError } = useFilterOptions();
  const selectsDisabled = isLoading || isError;

  function handleSearch(value: string) {
    onChange({ ...filters, p_search: value || undefined });
  }

  function handleMunicipio(value: string) {
    onChange({ ...filters, p_municipio: value === '_all' ? undefined : value });
  }

  function handleEsfera(value: string) {
    onChange({
      ...filters,
      p_esfera:
        value === '_all'
          ? undefined
          : (value as 'MUNICIPAL' | 'ESTADUAL' | 'FEDERAL'),
    });
  }

  function handleCategoria(value: string) {
    onChange({ ...filters, p_categoria: value === '_all' ? undefined : value });
  }

  function handleValorMin(e: React.ChangeEvent<HTMLInputElement>) {
    const num = parseFloat(e.target.value);
    onChange({
      ...filters,
      p_valor_min: isNaN(num) ? undefined : num,
    });
  }

  function handleValorMax(e: React.ChangeEvent<HTMLInputElement>) {
    const num = parseFloat(e.target.value);
    onChange({
      ...filters,
      p_valor_max: isNaN(num) ? undefined : num,
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      {isError && (
        <p className="w-full text-xs text-destructive">
          Falha ao carregar as opções de filtro. Tente recarregar a página.
        </p>
      )}

      <div className="min-w-[200px] flex-1">
        <SearchInput
          value={filters.p_search ?? ''}
          onChange={handleSearch}
          placeholder="Buscar órgão..."
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Município</Label>
        <Select
          value={filters.p_municipio ?? '_all'}
          onValueChange={handleMunicipio}
          disabled={selectsDisabled}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={isLoading ? 'Carregando...' : 'Todos'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos</SelectItem>
            {options?.municipios.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Esfera</Label>
        <Select
          value={filters.p_esfera ?? '_all'}
          onValueChange={handleEsfera}
          disabled={selectsDisabled}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={isLoading ? 'Carregando...' : 'Todas'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas</SelectItem>
            {options?.esferas.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Categoria</Label>
        <Select
          value={filters.p_categoria ?? '_all'}
          onValueChange={handleCategoria}
          disabled={selectsDisabled}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={isLoading ? 'Carregando...' : 'Todas'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas</SelectItem>
            {options?.categorias.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Valor mín. (R$)</Label>
        <Input
          type="number"
          min={0}
          step={1000}
          placeholder="0"
          value={filters.p_valor_min ?? ''}
          onChange={handleValorMin}
          className="w-[120px]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Valor máx. (R$)</Label>
        <Input
          type="number"
          min={0}
          step={1000}
          placeholder="Sem limite"
          value={filters.p_valor_max ?? ''}
          onChange={handleValorMax}
          className="w-[120px]"
        />
      </div>
    </div>
  );
}
