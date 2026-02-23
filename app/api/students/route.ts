import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
    // ── 1. Oturum doğrulama (anon key ile) ─────────────────────────────────
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── 2. Rol doğrulama — yalnızca parent ekleyebilir ─────────────────────
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profileError || !profile?.role) {
        console.error('[POST /api/students] Profile fetch failed:', profileError?.message)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (profile.role !== 'parent') {
        return NextResponse.json({ error: 'Forbidden: only parents can add students' }, { status: 403 })
    }

    // ── 3. Input validasyonu ────────────────────────────────────────────────
    let body: { name?: unknown; email?: unknown; password?: unknown }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 })
    }

    const { name, email, password } = body

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return NextResponse.json({ error: 'Ad en az 2 karakter olmalıdır' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
        return NextResponse.json({ error: 'Geçersiz email formatı' }, { status: 400 })
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
        return NextResponse.json({ error: 'Şifre en az 6 karakter olmalıdır' }, { status: 400 })
    }

    // ── 4. Admin client ile auth kullanıcı oluştur ─────────────────────────
    const adminSupabase = createAdminClient()

    const { data: newUser, error: createUserError } = await adminSupabase.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true, // E-posta doğrulama zorunluluğu olmadan aktive et
    })

    if (createUserError || !newUser.user) {
        console.error('[POST /api/students] createUser failed:', createUserError?.message)
        return NextResponse.json(
            { error: createUserError?.message ?? 'Kullanıcı oluşturulamadı' },
            { status: 400 }
        )
    }

    const newUserId = newUser.user.id

    // ── 5. profiles tablosundaki rolü 'student' olarak güncelle ────────────
    // Not: handle_new_user trigger'ı createUser() ile birlikte otomatik olarak
    //      profiles satırını role='parent' ile oluşturur. Bu yüzden INSERT değil
    //      UPDATE yapıyoruz.
    const { error: profileUpdateError } = await adminSupabase
        .from('profiles')
        .update({ role: 'student' })
        .eq('id', newUserId)

    if (profileUpdateError) {
        console.error('[POST /api/students] Profile update failed:', profileUpdateError.message)
        // Cleanup: auth user'ı sil (profile trigger tarafından oluşturuldu, cascade ile silinir)
        await adminSupabase.auth.admin.deleteUser(newUserId)
        return NextResponse.json({ error: 'Profil güncellenemedi' }, { status: 500 })
    }

    // ── 6. students tablosuna insert (parent_id = doğrulanmış parent) ──────
    const { data: student, error: studentInsertError } = await adminSupabase
        .from('students')
        .insert({
            user_id: newUserId,
            parent_id: user.id,           // Client body'sinden DEĞİL, session'dan
            name: name.trim(),
        })
        .select()
        .single()

    if (studentInsertError) {
        console.error('[POST /api/students] Student insert failed:', studentInsertError.message)
        // Cleanup: profile ve auth user'ı sil
        await adminSupabase.from('profiles').delete().eq('id', newUserId)
        await adminSupabase.auth.admin.deleteUser(newUserId)
        return NextResponse.json({ error: 'Öğrenci kaydı oluşturulamadı' }, { status: 500 })
    }

    return NextResponse.json({ student }, { status: 201 })
}
