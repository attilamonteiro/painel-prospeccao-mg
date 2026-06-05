'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatBRL } from '@/shared/lib/formatters'
import type { DashboardStats } from '@/shared/types/dashboard'

interface TopMunicipiosProps {
  topMunicipios: DashboardStats['top_municipios']
}

export function TopMunicipios({ topMunicipios }: TopMunicipiosProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Municípios</CardTitle>
      </CardHeader>
      <CardContent>
        {topMunicipios.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum município encontrado.</p>
        ) : (
          <ul className="space-y-3">
            {topMunicipios.map((item) => (
              <li
                key={item.municipio}
                className="flex items-center justify-between gap-4"
              >
                <span className="truncate text-sm font-medium">{item.municipio}</span>
                <div className="flex shrink-0 flex-col items-end text-xs text-muted-foreground">
                  <span>{item.total_orgaos.toLocaleString('pt-BR')} órgãos</span>
                  <span className="font-medium text-foreground">{formatBRL(item.valor_total)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
