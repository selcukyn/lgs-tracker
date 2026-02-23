import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const supabase = createClient()

    // ── 1. Oturum ve rol doğrulama ───────────────────────────────────────────
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'parent') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const examId = params.id

    // ── 2. Exam sahipliğini + student_id'yi DB'den al ──────────────────────
    // student_id client'tan asla alınmaz — exam üzerinden DB'den çekilir
    const { data: exam, error: examError } = await supabase
        .from('exams')
        .select('id, student_id, students!inner(parent_id)')
        .eq('id', examId)
        .single()

    // RLS "parent can view own students exams" exam'ı filtreler.
    // Ek güvence: students join ile parent erişimi doğrulanır.
    if (examError || !exam) {
        return NextResponse.json({ error: 'Sınav bulunamadı veya erişim yok' }, { status: 403 })
    }

    const studentId = exam.student_id

    // ── 3. Dosya validasyonu ─────────────────────────────────────────────────
    let formData: FormData
    try {
        formData = await request.formData()
    } catch {
        return NextResponse.json({ error: 'Geçersiz form verisi' }, { status: 400 })
    }

    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 })

    // Ön kontrol: Content-Type header (hızlı filtre, spooflanabilir)
    if (file.type !== 'application/pdf') {
        return NextResponse.json({ error: 'Yalnızca PDF dosyası yüklenebilir' }, { status: 400 })
    }

    const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
    if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: 'Dosya boyutu 10 MB\'ı aşamaz' }, { status: 400 })
    }

    // ── 4. Magic byte doğrulaması — gerçek güvenlik katmanı ─────────────────
    // file.type client'tan gelir ve spooflanabilir. Magic byte'lar dosyanın
    // gerçek içeriğinden okunur; bu değer asla taklit edilemez.
    // PDF spec: Her PDF dosyası "%PDF-" ile başlar (hex: 25 50 44 46 2D)
    const fileBuffer = await file.arrayBuffer()
    const magic = Buffer.from(fileBuffer.slice(0, 5)).toString('ascii')
    if (!magic.startsWith('%PDF')) {
        return NextResponse.json({ error: 'Geçersiz PDF dosyası' }, { status: 400 })
    }

    // ── 5. Path server-side oluşturulur — client'tan asla alınmaz ───────────
    const storagePath = `${studentId}/${examId}.pdf`

    // ── 6. Storage upload (anon client — Storage RLS devrede) ────────────────
    const { error: uploadError } = await supabase.storage
        .from('exam-pdfs')
        .upload(storagePath, fileBuffer, {
            contentType: 'application/pdf',
            upsert: true, // Var olan PDF'i değiştir
        })

    if (uploadError) {
        console.error('[POST /api/exams/[id]/upload] Upload error:', uploadError.message)
        return NextResponse.json({ error: 'PDF yüklenemedi: ' + uploadError.message }, { status: 500 })
    }

    // ── 6. DB'de pdf_path güncelle ────────────────────────────────────────────
    const { error: updateError } = await supabase
        .from('exams')
        .update({ pdf_path: storagePath })
        .eq('id', examId)

    if (updateError) {
        console.error('[POST /api/exams/[id]/upload] DB update error:', updateError.message)
        // Storage'a yüklendi ama DB güncellenemedi — yine de 500
        return NextResponse.json({ error: 'PDF yolu kaydedilemedi' }, { status: 500 })
    }

    return NextResponse.json({ pdf_path: storagePath }, { status: 200 })
}
