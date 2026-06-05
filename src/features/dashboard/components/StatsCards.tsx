'use client'

import { Building2, FileText, DollarSign, Users, CalendarDays } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatBRL } from '@/shared/lib/formatters'
import type { DashboardStats } from '@/shared/types/dashboard'

interface StatsCardsProps {
  stats: DashboardStats
}

interface StatCardProps {
  title: string
  value: string
  icon: React.ReactNode
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        title="Total de Órgãos"
        value={stats.total_orgaos.toLocaleString('pt-BR')}
        icon={<Building2 className="h-4 w-4" />}
      />
      <StatCard
        title="Total de Contratos"
        value={stats.total_contratos.toLocaleString('pt-BR')}
        icon={<FileText className="h-4 w-4" />}
      />
      <StatCard
        title="Valor Total"
        value={formatBRL(stats.valor_total)}
        icon={<DollarSign className="h-4 w-4" />}
      />
      <StatCard
        title="Órgãos com Contato"
        value={stats.orgaos_com_contato.toLocaleString('pt-BR')}
        icon={<Users className="h-4 w-4" />}
      />
      <StatCard
        title="Últimos 30 Dias"
        value={stats.ultimos_30_dias.toLocaleString('pt-BR')}
        icon={<CalendarDays className="h-4 w-4" />}
      />
    </div>
  )
}
