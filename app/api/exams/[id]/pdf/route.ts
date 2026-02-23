import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const supabase = createClient()
    const examId = params.id

    // ── 1. Oturum doğrulama ──────────────────────────────────────────────────
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile?.role) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── 2. Role'e göre sahiplik doğrulama + pdf_path al ─────────────────────
    let pdfPath: string | null = null

    if (profile.role === 'parent') {
        // Parent: sınav kendi öğrencisine mi ait?
        const { data: exam } = await supabase
            .from('exams')
            .select('pdf_path, students!inner(parent_id)')
            .eq('id', examId)
            .single()

        if (!exam) return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
        pdfPath = exam.pdf_path

    } else if (profile.role === 'student') {
        // Student: sınav kendi kaydına mı ait?
        const { data: studentRecord } = await supabase
            .from('students')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (!studentRecord) return NextResponse.json({ error: 'Öğrenci kaydı bulunamadı' }, { status: 403 })

        const { data: exam } = await supabase
            .from('exams')
            .select('pdf_path')
            .eq('id', examId)
            .eq('student_id', studentRecord.id)
            .single()

        if (!exam) return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
        pdfPath = exam.pdf_path

    } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!pdfPath) {
        return NextResponse.json({ error: 'Bu sınav için PDF bulunamadı' }, { status: 404 })
    }

    // ── 3. Signed URL oluştur (60 saniye) ───────────────────────────────────
    // Admin client kullanılır: storage erişimi server'da doğrulandı,
    // signed URL kısa sürelidir (60 sn) ve public URL vermez.
    const adminSupabase = createAdminClient()
    const { data: signedData, error: signedError } = await adminSupabase.storage
        .from('exam-pdfs')
        .createSignedUrl(pdfPath, 60)

    if (signedError || !signedData?.signedUrl) {
        console.error('[GET /api/exams/[id]/pdf] Signed URL error:', signedError?.message)
        return NextResponse.json({ error: 'PDF URL oluşturulamadı' }, { status: 500 })
    }

    const expiresAt = new Date(Date.now() + 60 * 1000).toISOString()

    return NextResponse.json({
        url: signedData.signedUrl,
        expiresAt,
    }, { status: 200 })
}
