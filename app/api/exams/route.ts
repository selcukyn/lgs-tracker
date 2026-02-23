import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { SUBJECT_KEYS } from '@/lib/lgs'

// Column names after migration SQL
const RANK_SELECT = 'exam_average, class_rank, school_rank, district_rank, city_rank, national_rank, total_participants'

// ── Strict validation helpers ───────────────────────────────────────────────────────
function parseOptionalPositiveInt(val: unknown, name: string) {
    if (val === undefined || val === null || val === '') return { value: null, error: null }
    const n = Number(val)
    if (!Number.isInteger(n) || n <= 0) {
        return { value: null, error: `${name} pozitif tam sayı (>0) olmalıdır` }
    }
    return { value: n, error: null }
}

function validateRanking(body: Record<string, unknown>) {
    const result: Record<string, number | null> = {}

    // ── examAverage: numeric, 100–500 ───────────────────────────────────────────
    if (body.examAverage !== undefined && body.examAverage !== null && body.examAverage !== '') {
        const avg = Number(body.examAverage)
        if (isNaN(avg)) return { ranking: null, error: 'Genel ortalama sayısal olmalıdır' }
        if (avg < 100) return { ranking: null, error: 'LGS ortalama en az 100 olmalıdır' }
        if (avg > 500) return { ranking: null, error: 'LGS ortalama en fazla 500 olabilir' }
        result['exam_average'] = avg
    } else {
        result['exam_average'] = null
    }

    // ── Rank fields: positive integer > 0 ──────────────────────────────────────────
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

    // ── total_participants: positive integer > 0 ─────────────────────────────────
    const { value: totalPart, error: totalErr } = parseOptionalPositiveInt(body.totalParticipants, 'Toplam katılımcı')
    if (totalErr) return { ranking: null, error: totalErr }
    result['total_participants'] = totalPart

    // ── Cross-field: nationalRank ≤ total_participants ──────────────────────────────
    const natRank = result['national_rank']
    const partCount = result['total_participants']
    if (natRank !== null && partCount !== null && natRank > partCount) {
        return { ranking: null, error: `Türkiye sırası (${natRank}) toplam katılımcıyı (${partCount}) geçemez` }
    }

    return { ranking: result, error: null }
}

async function authorizeParent(supabase: ReturnType<typeof createClient>) {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return { error: 'Unauthorized', status: 401 as const, user: null }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'parent') return { error: 'Forbidden', status: 403 as const, user: null }
    return { error: null, status: 200 as const, user }
}

async function verifyStudentOwnership(
    supabase: ReturnType<typeof createClient>,
    studentId: string,
    parentId: string
) {
    const { data, error } = await supabase
        .from('students').select('id').eq('id', studentId).eq('parent_id', parentId).single()
    return !error && !!data
}

// ── GET /api/exams?studentId=xxx ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
    const supabase = createClient()
    const { error, status, user } = await authorizeParent(supabase)
    if (error || !user) return NextResponse.json({ error }, { status })

    const studentId = request.nextUrl.searchParams.get('studentId')
    if (!studentId) return NextResponse.json({ error: 'studentId gerekli' }, { status: 400 })

    const isOwner = await verifyStudentOwnership(supabase, studentId, user.id)
    if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: exams, error: fetchError } = await supabase
        .from('exams')
        .select(`id, exam_name, exam_type, institution, total_score, ${RANK_SELECT}, exam_date, lgs_score, created_at`)
        .eq('student_id', studentId)
        .order('exam_date', { ascending: false })

    if (fetchError) return NextResponse.json({ error: 'Sınavlar getirilemedi' }, { status: 500 })
    return NextResponse.json({ exams }, { status: 200 })
}

// ── POST /api/exams — Atomik (RPC) + metadata UPDATE ─────────────────────────
export async function POST(request: NextRequest) {
    const supabase = createClient()
    const { error, status, user } = await authorizeParent(supabase)
    if (error || !user) return NextResponse.json({ error }, { status })

    let body: Record<string, unknown>
    try { body = await request.json() }
    catch { return NextResponse.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 }) }

    const { studentId, examDate, examName, examType, institution, results } = body

    if (!studentId || typeof studentId !== 'string') {
        return NextResponse.json({ error: 'studentId gerekli' }, { status: 400 })
    }
    if (!examName || typeof examName !== 'string' || (examName as string).trim().length < 2) {
        return NextResponse.json({ error: 'Sınav adı en az 2 karakter olmalıdır' }, { status: 400 })
    }
    if (!examDate || isNaN(Date.parse(String(examDate)))) {
        return NextResponse.json({ error: 'Geçerli bir sınav tarihi girin' }, { status: 400 })
    }

    const isOwner = await verifyStudentOwnership(supabase, studentId, user.id)
    if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
    }

    // ── Ranking validasyonu ───────────────────────────────────────────────────
    const { ranking, error: rankErr } = validateRanking(body)
    if (rankErr) return NextResponse.json({ error: rankErr }, { status: 400 })

    const rpcResults: Record<string, { correct: number; wrong: number; blank: number }> = {}
    for (const key of SUBJECT_KEYS) {
        const s = resultsObj[key] as Record<string, unknown>
        rpcResults[key] = { correct: Number(s.correct), wrong: Number(s.wrong), blank: Number(s.blank) }
    }

    // ── RPC: exam + 6 subjects atomik ────────────────────────────────────────
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_lgs_exam', {
        p_student_id: studentId,
        p_exam_date: String(examDate),
        p_exam_name: (examName as string).trim(),
        p_exam_type: examType ? String(examType).trim() : null,
        p_institution: institution ? String(institution).trim() : null,
        p_results: rpcResults,
    })

    if (rpcError) {
        console.error('[POST /api/exams] RPC error:', rpcError.message)
        return NextResponse.json({ error: rpcError.message }, { status: 400 })
    }

    // ── Ranking metadata UPDATE (RPC dışında, opsiyonel) ─────────────────────
    // rpcData may be null if the RPC returns void — use safe optional chaining
    const examId = (rpcData as Record<string, unknown> | null)?.exam_id as string | undefined
    if (examId && ranking && Object.values(ranking).some(v => v !== null)) {
        try {
            await supabase.from('exams').update(ranking).eq('id', examId)
        } catch (e) {
            console.error('[POST /api/exams] Ranking update failed (non-fatal):', e)
        }
    }

    return NextResponse.json({ exam: rpcData }, { status: 201 })
}
