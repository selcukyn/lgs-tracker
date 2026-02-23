import { SupabaseClient } from '@supabase/supabase-js'
import { LGS_SUBJECTS } from './lgs'

export type AnalyticsTrend = {
    direction: 'up' | 'down' | 'same' | 'none'
    delta: number
    last3Exams: { id: string; name: string; date: string; score: number }[]
}

export type AnalyticsClassification = {
    label: string
    color: string
}

export type AverageNet = {
    subject: string
    average: number
}

export type SubjectPerformance = {
    name: string
    average: number
    weightedScore: number
    coefficient: number
}

export type StudentAnalytics = {
    studentId: string
    latestScore: number | null
    classification: AnalyticsClassification | null
    trend: AnalyticsTrend
    strongestSubject: SubjectPerformance | null
    weakestSubject: SubjectPerformance | null
    averageNets: AverageNet[]
    percentile: number | null
    percentileMessage: string | null
    version: number
}

function normalizeText(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, '')
        .trim()
}

function normalizeSubject(name: string): string {
    const trimmed = name.trim()
    const normalized = normalizeText(trimmed)
    const match = LGS_SUBJECTS.find(
        (s) => normalizeText(s.label) === normalized || normalizeText(s.key) === normalized
    )
    return match ? match.key : trimmed
}

export async function generateAnalytics(studentId: string, supabase: SupabaseClient): Promise<StudentAnalytics> {
    const { data: exams } = await supabase
        .from('exams')
        .select('id, exam_name, exam_type, institution, total_score, national_rank, school_rank, city_rank, district_rank, class_rank, exam_average, total_participants, exam_date, pdf_path, lgs_score')
        .eq('student_id', studentId)
        .order('exam_date', { ascending: false })

    // Internal calculations require strictly ASC order (oldest to newest)
    const examList = (exams ?? []).sort((a: Record<string, unknown>, b: Record<string, unknown>) => String(a.exam_date).localeCompare(String(b.exam_date)))

    let subjectResults: Record<string, unknown>[] = []
    if (examList.length > 0) {
        const { data: subjects } = await supabase
            .from('exam_subject_results')
            .select('id, exam_id, subject, question_count, correct, wrong, blank, net, success_percentage')
            .in('exam_id', examList.map((e: Record<string, unknown>) => e.id))
        subjectResults = subjects ?? []
    }

    // Latest Score & Classification
    const examsWithScore = examList.filter((e: Record<string, unknown>) => e.lgs_score != null)
    let latestScore: number | null = null
    let classification: AnalyticsClassification | null = null

    if (examsWithScore.length > 0) {
        latestScore = examsWithScore[examsWithScore.length - 1].lgs_score

        if (latestScore! >= 450) classification = { label: 'Mükemmel', color: 'text-emerald-400' }
        else if (latestScore! >= 400) classification = { label: 'Çok İyi', color: 'text-green-400' }
        else if (latestScore! >= 350) classification = { label: 'İyi', color: 'text-blue-400' }
        else if (latestScore! >= 300) classification = { label: 'Orta', color: 'text-yellow-400' }
        else classification = { label: 'Geliştirilmeli', color: 'text-red-400' }
    }

    // Trend
    // Take the last 3 exams (most recent 3) in ASC order
    const last3Exams = examsWithScore.slice(-3).map((e: Record<string, unknown>) => ({
        id: String(e.id),
        name: String(e.exam_name),
        date: String(e.exam_date),
        score: Number(e.lgs_score ?? 0)
    }))

    let trendDirection: 'up' | 'down' | 'same' | 'none' = 'none'
    let trendDelta = 0
    if (last3Exams.length >= 2) {
        const latestInfo = last3Exams[last3Exams.length - 1]
        const previousInfo = last3Exams[last3Exams.length - 2]
        trendDelta = latestInfo.score - previousInfo.score
        if (trendDelta > 0) trendDirection = 'up'
        else if (trendDelta < 0) trendDirection = 'down'
        else trendDirection = 'same'
    }

    // Subjects: Average Nets and Strongest/Weakest
    const sums: Record<string, number> = {}
    const counts: Record<string, number> = {}
    subjectResults.forEach((sr: Record<string, unknown>) => {
        if (sr.net != null) {
            const normSubj = normalizeSubject(String(sr.subject))
            sums[normSubj] = (sums[normSubj] || 0) + Number(sr.net)
            counts[normSubj] = (counts[normSubj] || 0) + 1
        }
    })

    const averageNets: AverageNet[] = []
    let strongestSubject: SubjectPerformance | null = null
    let weakestSubject: SubjectPerformance | null = null

    if (Object.keys(sums).length > 0) {
        let maxWeighted = -Infinity
        let minWeighted = Infinity

        for (const [subj, sum] of Object.entries(sums)) {
            if (counts[subj] > 0) {
                const avg = sum / counts[subj]
                averageNets.push({ subject: subj, average: avg })

                const coeff = LGS_SUBJECTS.find((def) => def.key === subj)?.coefficient || 1
                const weightedScore = avg * coeff

                const perf: SubjectPerformance = {
                    name: subj,
                    average: avg,
                    weightedScore,
                    coefficient: coeff
                }

                if (weightedScore > maxWeighted) {
                    maxWeighted = weightedScore
                    strongestSubject = perf
                }
                if (weightedScore < minWeighted) {
                    minWeighted = weightedScore
                    weakestSubject = perf
                }
            }
        }
        if (maxWeighted === minWeighted) {
            strongestSubject = null
            weakestSubject = null
        }
    }

    // Percentile - Deterministic fix
    let percentile: number | null = null
    let percentileMessage: string | null = null

    const validRankExams = examList.filter((e: Record<string, unknown>) => e.national_rank != null && e.total_participants != null && Number(e.total_participants) > 0)

    if (validRankExams.length > 0) {
        const latestWithRank = validRankExams.sort((a: Record<string, unknown>, b: Record<string, unknown>) => String(b.exam_date).localeCompare(String(a.exam_date)))[0]
        percentile = (Number(latestWithRank.national_rank) / Number(latestWithRank.total_participants)) * 100
        percentileMessage = `Türkiye genelinde %${percentile.toFixed(2)} dilimdesiniz.`
    }

    return {
        studentId: studentId ?? '',
        latestScore: latestScore ?? null,
        classification: classification ?? null,
        trend: {
            direction: trendDirection,
            delta: trendDelta ?? 0,
            last3Exams: last3Exams ?? []
        },
        strongestSubject: strongestSubject ?? null,
        weakestSubject: weakestSubject ?? null,
        averageNets: averageNets ?? [],
        percentile: percentile ?? null,
        percentileMessage: percentileMessage ?? null,
        version: 1
    }
}
