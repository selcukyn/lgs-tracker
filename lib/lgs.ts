// LGS sabit ders tanımları
// Bu dosya server ve client tarafında ortak kullanılır

export const LGS_SUBJECTS = [
    { key: 'Türkçe', label: 'Türkçe', questionCount: 20, coefficient: 4 },
    { key: 'Matematik', label: 'Matematik', questionCount: 20, coefficient: 4 },
    { key: 'Fen', label: 'Fen Bilimleri', questionCount: 20, coefficient: 4 },
    { key: 'İnkılap', label: 'T.C. İnkılap Tarihi', questionCount: 10, coefficient: 1 },
    { key: 'Din', label: 'Din Kültürü', questionCount: 10, coefficient: 1 },
    { key: 'İngilizce', label: 'İngilizce', questionCount: 10, coefficient: 1 },
] as const

export type SubjectKey = typeof LGS_SUBJECTS[number]['key']

export const SUBJECT_KEYS = LGS_SUBJECTS.map(s => s.key) as SubjectKey[]

export const SUBJECT_MAP = Object.fromEntries(
    LGS_SUBJECTS.map(s => [s.key, s])
) as Record<SubjectKey, typeof LGS_SUBJECTS[number]>

// LGS Puanı Hesaplama
// lgs_score = 200 + (weighted_total / 270) * 300
// max: 200 + (270/270) * 300 = 500
// min: 200 + (0/270) * 300 = 200
export const MAX_WEIGHTED = 270

export function computeLgsScore(
    subjectNets: Record<string, number>
): number {
    let weighted = 0
    for (const subject of LGS_SUBJECTS) {
        const net = subjectNets[subject.key] ?? 0
        weighted += net * subject.coefficient
    }
    const score = 200 + (weighted / MAX_WEIGHTED) * 300
    return Math.round(score * 100) / 100 // 2 decimal
}

// Global score formatter
export function formatScore(value: number | null | undefined): string {
    if (value == null || !isFinite(value)) return '-'
    return Number(value).toFixed(2)
}
