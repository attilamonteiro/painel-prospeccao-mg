import { type NextRequest } from 'next/server'
import { updateSession } from '@/shared/lib/supabase/middleware'

// Next 16: a convencao "middleware" foi renomeada para "proxy" (mesma capacidade).
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Aplica o proxy a todas as rotas exceto:
     * - _next/static  (arquivos estáticos)
     * - _next/image   (otimização de imagens)
     * - favicon.ico   (favicon)
     * - Arquivos com extensão (ex.: .png, .svg, .js, .css)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|otf|map)).*)',
  ],
}
