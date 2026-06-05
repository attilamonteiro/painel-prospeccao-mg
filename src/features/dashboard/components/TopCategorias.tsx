'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { DashboardStats } from '@/shared/types/dashboard'

interface TopCategoriasProps {
  topCategorias: DashboardStats['top_categorias']
}

export function TopCategorias({ topCategorias }: TopCategoriasProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Categorias</CardTitle>
      </CardHeader>
      <CardContent>
        {topCategorias.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma categoria encontrada.</p>
        ) : (
          <ul className="space-y-2">
            {topCategorias.map((item) => (
              <li
                key={item.categoria}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate text-sm">{item.categoria}</span>
                <Badge variant="secondary">{item.total.toLocaleString('pt-BR')}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
