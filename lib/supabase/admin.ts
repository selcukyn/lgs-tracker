import { createClient } from '@supabase/supabase-js'

/**
 * Supabase Admin Client — service role key ile oluşturulur.
 * YALNIZCA server-side API route'larında kullanılır.
 * Client component'lere asla import edilmez.
 */
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
            'SUPABASE_SERVICE_ROLE_KEY ortam değişkeni tanımlı değil. ' +
            '.env.local dosyasına ekleyin.'
        )
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
}
