import { createClient } from '@/shared/lib/supabase/client'
import { DashboardStatsSchema } from '@/shared/schemas/dashboard'
import type { DashboardStats } from '@/shared/types/dashboard'

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const supabase = createClient()

    const { data, error } = await supabase.rpc('get_dashboard_stats')

    if (error) {
      throw new Error(error.message)
    }

    return DashboardStatsSchema.parse(data)
  },
}
