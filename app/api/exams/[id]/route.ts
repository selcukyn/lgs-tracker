import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { LGS_SUBJECTS, SUBJECT_KEYS, SUBJECT_MAP, computeLgsScore } from '@/lib/lgs'

function parseOptionalPositiveInt(val: unknown, name: string) {
    if (val === undefined || val === null || val === '') return { value: null, error: null }
    const n = Number(val)
    if (!Number.isInteger(n) || n <= 0) return { value: null, error: `${name} pozitif tam sayı (>0) olmalıdır` }
    return { value: n, error: null }
}

function validateRanking(body: Record<string, unknown>) {
    const result: Record<string, number | null> = {}

    // examAverage: numeric, 100–500
    if (body.examAverage !== undefined && body.examAverage !== null && body.examAverage !== '') {
        const avg = Number(body.examAverage)
        if (isNaN(avg)) return { ranking: null, error: 'Genel ortalama sayısal olmalıdır' }
        if (avg < 100) return { ranking: null, error: 'LGS ortalama en az 100 olmalıdır' }
        if (avg > 500) return { ranking: null, error: 'LGS ortalama en fazla 500 olabilir' }
        result['exam_average'] = avg
    } else {
        result['exam_average'] = null
    }

    // Rank fields: positive integer > 0
    const rankFields = [
        { key: 'classRank', col: 'class_rank', label: 'Sınıf sırası' },
        { key: 'schoolRank', col: 'school_rank', label: 'Okul sırası' },
        { key: 'districtRank', col: 'district_rank', label: 'İlçe sırası' },
        { key: 'cityRank', col: 'city_rank', label: 'İl sırası' },
        { key: 'nationalRank', col: 'national_rank', label: 'Türkiye sırası' },
    ]
    for (const f of rankFields) {
        const { value, error } = parseOptionalPositiveInt(body[f.key], f.label)
        if (error) return { ranking: null, error }
        result[f.col] = value
    }

    // total_participants: positive integer > 0
    const { value: totalPart, error: totalErr } = parseOptionalPositiveInt(body.totalParticipants, 'Toplam katılımcı')
    if (totalErr) return { ranking: null, error: totalErr }
    result['total_participants'] = totalPart

    // Cross-field: nationalRank ≤ total_participants
    const natRank = result['national_rank']
    const partCount = result['total_participants']
    if (natRank !== null && partCount !== null && natRank > partCount) {
        return { ranking: null, error: `Türkiye sırası (${natRank}) toplam katılımcıyı (${partCount}) geçemez` }
    }

    return { ranking: result, error: null }
}


async function authorizeParentExam(
    supabase: ReturnType<typeof createClient>,
    examId: string
) {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { user: null, error: 'Unauthorized', status: 401 as const }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'parent') return { user: null, error: 'Forbidden', status: 403 as const }

    // Ownership: RLS SELECT + parent_id join
    const { data: exam } = await supabase
        .from('exams').select('id, students!inner(parent_id)').eq('id', examId).single()
    if (!exam) return { user: null, error: 'Sınav bulunamadı', status: 404 as const }

    return { user, error: null, status: 200 as const }
}

// ── DELETE /api/exams/[id] ────────────────────────────────────────────────────
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const supabase = createClient()
    const examId = params.id
    if (!examId) return NextResponse.json({ error: 'Sınav ID gerekli' }, { status: 400 })

    const { error, status } = await authorizeParentExam(supabase, examId)
    if (error) return NextResponse.json({ error }, { status })

    // 1. Önce ders sonuçlarını sil (FK constraint)
    const { error: subjectDeleteError } = await supabase
        .from('exam_subject_results').delete().eq('exam_id', examId)

    if (subjectDeleteError) {
        console.error('[DELETE /api/exams/[id]] Subject delete error:', subjectDeleteError.message)
        return NextResponse.json({ error: 'Ders sonuçları silinemedi' }, { status: 500 })
    }

    // 2. Sınavı sil
    const { error: deleteError } = await supabase.from('exams').delete().eq('id', examId)

    if (deleteError) {
        console.error('[DELETE /api/exams/[id]] Exam delete error:', deleteError.message)
        return NextResponse.json({ error: 'Sınav silinemedi' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
}

// ── PATCH /api/exams/[id] — Sınav güncelle ───────────────────────────────────
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const supabase = createClient()
    const examId = params.id
    if (!examId) return NextResponse.json({ error: 'Sınav ID gerekli' }, { status: 400 })

    const { error, status } = await authorizeParentExam(supabase, examId)
    if (error) return NextResponse.json({ error }, { status })

    let body: Record<string, unknown>
    try { body = await request.json() }
    catch { return NextResponse.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 }) }

    const { examDate, examName, examType, institution, results } = body

    // ── Validasyon ────────────────────────────────────────────────────────────
    if (!examName || typeof examName !== 'string' || (examName as string).trim().length < 2) {
        return NextResponse.json({ error: 'Sınav adı en az 2 karakter olmalıdır' }, { status: 400 })
    }
    if (!examDate || isNaN(Date.parse(String(examDate)))) {
        return NextResponse.json({ error: 'Geçerli bir sınav tarihi girin' }, { status: 400 })
    }
    if (!results || typeof results !== 'object') {
        return NextResponse.json({ error: 'results objesi gerekli' }, { status: 400 })
    }
    const resultsObj = results as Record<string, unknown>

    for (const key of SUBJECT_KEYS) {
        if (!resultsObj[key]) return NextResponse.json({ error: `${key} dersi eksik` }, { status: 400 })
        const s = resultsObj[key] as Record<string, unknown>
        for (const field of ['correct', 'wrong', 'blank']) {
            const v = Number(s[field])
            if (!Number.isInteger(v) || v < 0) {
                return NextResponse.json({ error: `${key}.${field} >= 0 tam sayı olmalıdır` }, { status: 400 })
            }
        }
        const def = SUBJECT_MAP[key]
        const c = Number(s.correct), w = Number(s.wrong), b = Number(s.blank)
        if (c + w + b !== def.questionCount) {
            return NextResponse.json({
                error: `${def.label} için toplam ${def.questionCount} olmalıdır (${c + w + b} girildi)`
            }, { status: 400 })
        }
    }

    // ── Server-side hesaplama ─────────────────────────────────────────────────
    const netMap: Record<string, number> = {}
    for (const key of SUBJECT_KEYS) {
        const s = resultsObj[key] as Record<string, unknown>
        netMap[key] = Number(s.correct) - Number(s.wrong) / 3.0
    }
    const lgs_score = computeLgsScore(netMap)

    // ── 1. Exam metadata + ranking güncelle ──────────────────────────────────
    const { ranking, error: rankErr } = validateRanking(body)
    if (rankErr) return NextResponse.json({ error: rankErr }, { status: 400 })

    const { error: examUpdateError } = await supabase
        .from('exams')
        .update({
            exam_name: (examName as string).trim(),
            exam_date: String(examDate),
            exam_type: examType ? String(examType).trim() : null,
            institution: institution ? String(institution).trim() : null,
            lgs_score,
            ...(ranking ?? {}),
        })
        .eq('id', examId)

    if (examUpdateError) {
        console.error('[PATCH /api/exams/[id]] Exam update error:', examUpdateError.message)
        return NextResponse.json({ error: 'Sınav güncellenemedi' }, { status: 500 })
    }

    // ── 2. Eski ders sonuçlarını sil ──────────────────────────────────────────
    await supabase.from('exam_subject_results').delete().eq('exam_id', examId)

    // ── 3. Yeni ders sonuçlarını ekle ─────────────────────────────────────────
    const rows = LGS_SUBJECTS.map(def => {
        const s = resultsObj[def.key] as Record<string, unknown>
        return {
            exam_id: examId,
            subject: def.key,
            question_count: def.questionCount,
            correct: Number(s.correct),
            wrong: Number(s.wrong),
            blank: Number(s.blank),
        }
    })

    const { error: insertError } = await supabase.from('exam_subject_results').insert(rows)

    if (insertError) {
        console.error('[PATCH /api/exams/[id]] Subject insert error:', insertError.message)
        return NextResponse.json({ error: 'Ders sonuçları eklenemedi' }, { status: 500 })
    }

    return NextResponse.json({ success: true, lgs_score }, { status: 200 })
}
