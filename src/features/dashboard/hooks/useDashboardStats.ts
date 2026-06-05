'use client'

import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/features/dashboard/lib/dashboardService'
import type { DashboardStats } from '@/shared/types/dashboard'

export function useDashboardStats() {
  return useQuery<DashboardStats, Error>({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getStats,
  })
}
