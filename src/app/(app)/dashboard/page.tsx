'use client'

import { useDashboardStats } from '@/features/dashboard/hooks/useDashboardStats'
import { StatsCards } from '@/features/dashboard/components/StatsCards'
import { TopCategorias } from '@/features/dashboard/components/TopCategorias'
import { TopMunicipios } from '@/features/dashboard/components/TopMunicipios'
import { StateHandler } from '@/shared/components/StateHandler'

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboardStats()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      <StateHandler
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
      >
        {data && (
          <div className="space-y-6">
            <StatsCards stats={data} />
            <div className="grid gap-4 md:grid-cols-2">
              <TopCategorias topCategorias={data.top_categorias} />
              <TopMunicipios topMunicipios={data.top_municipios} />
            </div>
          </div>
        )}
      </StateHandler>
    </div>
  )
}
