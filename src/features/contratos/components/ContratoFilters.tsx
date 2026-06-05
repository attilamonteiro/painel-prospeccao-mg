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
import { useContratoFilterOptions } from '../hooks/useContratos';

interface ContratoFiltersValue {
  search: string;
  modalidade: string;
  valorMin: string;
  valorMax: string;
  dataInicio: string;
  dataFim: string;
}

interface ContratoFiltersProps {
  value: ContratoFiltersValue;
  onChange: (value: Partial<ContratoFiltersValue>) => void;
}

export function ContratoFilters({ value, onChange }: ContratoFiltersProps) {
  const { data: filterOptions, isLoading, isError } = useContratoFilterOptions();
  const modalidades = filterOptions?.modalidades ?? [];

  return (
    <div className="flex flex-col gap-4">
      {isError && (
        <p className="text-xs text-destructive">
          Falha ao carregar as modalidades. Tente recarregar a página.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {/* Busca no objeto */}
        <SearchInput
          value={value.search}
          onChange={(v) => onChange({ search: v })}
          placeholder="Buscar no objeto do contrato..."
          className="min-w-[220px] flex-1"
        />

        {/* Modalidade */}
        <Select
          value={value.modalidade}
          onValueChange={(v) => onChange({ modalidade: v === '_all' ? '' : v })}
          disabled={isLoading || isError}
        >
          <SelectTrigger className="min-w-[180px] w-auto">
            <SelectValue placeholder={isLoading ? 'Carregando...' : 'Modalidade'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas as modalidades</SelectItem>
            {modalidades.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        {/* Faixa de valor */}
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="valor-min" className="text-xs text-muted-foreground whitespace-nowrap">
              Valor mínimo (R$)
            </Label>
            <Input
              id="valor-min"
              type="number"
              min={0}
              placeholder="0"
              value={value.valorMin}
              onChange={(e) => onChange({ valorMin: e.target.value })}
              className="w-36"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="valor-max" className="text-xs text-muted-foreground whitespace-nowrap">
              Valor máximo (R$)
            </Label>
            <Input
              id="valor-max"
              type="number"
              min={0}
              placeholder="Sem limite"
              value={value.valorMax}
              onChange={(e) => onChange({ valorMax: e.target.value })}
              className="w-36"
            />
          </div>
        </div>

        {/* Período de assinatura */}
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="data-inicio" className="text-xs text-muted-foreground whitespace-nowrap">
              Assinatura de
            </Label>
            <Input
              id="data-inicio"
              type="date"
              value={value.dataInicio}
              onChange={(e) => onChange({ dataInicio: e.target.value })}
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="data-fim" className="text-xs text-muted-foreground whitespace-nowrap">
              até
            </Label>
            <Input
              id="data-fim"
              type="date"
              value={value.dataFim}
              onChange={(e) => onChange({ dataFim: e.target.value })}
              className="w-40"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
