'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LGS_SUBJECTS } from '@/lib/lgs'

type Props = {
    studentId: string
    studentName: string
}

type SubjectRow = { correct: string; wrong: string; blank: string }

function emptyRow(): SubjectRow {
    return { correct: '', wrong: '', blank: '' }
}

type RankingRow = {
    examAverage: string
    classRank: string; schoolRank: string
    districtRank: string; cityRank: string; nationalRank: string
    totalParticipants: string
}

function emptyRanking(): RankingRow {
    return { examAverage: '', classRank: '', schoolRank: '', districtRank: '', cityRank: '', nationalRank: '', totalParticipants: '' }
}

export default function AddExamForm({ studentId, studentName }: Props) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showRanking, setShowRanking] = useState(false)

    const [examName, setExamName] = useState('')
    const [examDate, setExamDate] = useState('')
    const [examType, setExamType] = useState('')
    const [institution, setInstitution] = useState('')
    const [ranking, setRanking] = useState<RankingRow>(emptyRanking())

    const [rows, setRows] = useState<Record<string, SubjectRow>>(
        Object.fromEntries(LGS_SUBJECTS.map(s => [s.key, emptyRow()]))
    )

    function updateRow(subject: string, field: keyof SubjectRow, value: string) {
        setRows(prev => ({
            ...prev,
            [subject]: { ...prev[subject], [field]: value }
        }))
    }

    function autoBlank(subject: string) {
        const def = LGS_SUBJECTS.find(s => s.key === subject)!
        const c = Number(rows[subject].correct || 0)
        const w = Number(rows[subject].wrong || 0)
        const remaining = def.questionCount - c - w
        if (remaining >= 0) {
            updateRow(subject, 'blank', String(remaining))
        }
    }

    function subjectTotal(subject: string) {
        const { correct, wrong, blank } = rows[subject]
        return Number(correct || 0) + Number(wrong || 0) + Number(blank || 0)
    }

    function getValidation(subject: string) {
        const def = LGS_SUBJECTS.find(s => s.key === subject)!
        const total = subjectTotal(subject)
        if (total === 0) return 'neutral'
        if (total === def.questionCount) return 'ok'
        return total > def.questionCount ? 'over' : 'under'
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const results: Record<string, { correct: number; wrong: number; blank: number }> = {}
        for (const s of LGS_SUBJECTS) {
            results[s.key] = {
                correct: Number(rows[s.key].correct || 0),
                wrong: Number(rows[s.key].wrong || 0),
                blank: Number(rows[s.key].blank || 0),
            }
        }

        const res = await fetch('/api/exams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentId, examDate, examName, examType, institution, results,
                examAverage: ranking.examAverage || undefined,
                classRank: ranking.classRank || undefined,
                schoolRank: ranking.schoolRank || undefined,
                districtRank: ranking.districtRank || undefined,
                cityRank: ranking.cityRank || undefined,
                nationalRank: ranking.nationalRank || undefined,
                totalParticipants: ranking.totalParticipants || undefined,
            }),
        })

        const data = await res.json()

        if (!res.ok) {
            setError(data.error ?? 'Bir hata oluştu')
            setLoading(false)
            return
        }

        // Reset
        setExamName(''); setExamDate(''); setExamType(''); setInstitution('')
        setRanking(emptyRanking())
        setShowRanking(false)
        setRows(Object.fromEntries(LGS_SUBJECTS.map(s => [s.key, emptyRow()])))
        setOpen(false)
        setLoading(false)
        router.refresh()
    }

    return (
        <div>
            <button
                onClick={() => { setOpen(!open); setError(null) }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Sınav Ekle
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-lg font-bold text-white">Sınav Ekle</h2>
                                    <p className="text-slate-400 text-sm mt-0.5">{studentName}</p>
                                </div>
                                <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white transition">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Sınav Bilgileri */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <label className="block text-xs text-slate-400 mb-1">Sınav Adı *</label>
                                        <input
                                            type="text" required value={examName}
                                            onChange={e => setExamName(e.target.value)}
                                            placeholder="örn. TürkTelekom Deneme 3"
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Sınav Tarihi *</label>
                                        <input
                                            type="date" required value={examDate}
                                            onChange={e => setExamDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Tür</label>
                                        <select value={examType} onChange={e => setExamType(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                            <option value="">Seçin...</option>
                                            {['Deneme', 'Kazanım', 'Kurum', 'Diğer'].map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs text-slate-400 mb-1">Kurum</label>
                                        <input
                                            type="text" value={institution}
                                            onChange={e => setInstitution(e.target.value)}
                                            placeholder="örn. Sınav Koleji"
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                {/* Ders Sonuçları */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-semibold text-white">Ders Sonuçları</h3>
                                        <span className="text-xs text-slate-500">Tüm 6 ders zorunlu</span>
                                    </div>

                                    <div className="space-y-2">
                                        {/* Header */}
                                        <div className="grid grid-cols-[1fr_72px_72px_72px_56px] gap-2 px-3 text-xs text-slate-500 font-medium">
                                            <span>Ders</span>
                                            <span className="text-center text-green-500">Doğru</span>
                                            <span className="text-center text-red-400">Yanlış</span>
                                            <span className="text-center">Boş</span>
                                            <span className="text-center">Toplam</span>
                                        </div>

                                        {LGS_SUBJECTS.map(s => {
                                            const v = getValidation(s.key)
                                            const total = subjectTotal(s.key)
                                            return (
                                                <div key={s.key}
                                                    className={`grid grid-cols-[1fr_72px_72px_72px_56px] gap-2 items-center px-3 py-2 rounded-lg border ${v === 'ok' ? 'border-green-600/30 bg-green-900/10' :
                                                        v === 'over' ? 'border-red-500/30 bg-red-900/10' :
                                                            'border-slate-800 bg-slate-900'
                                                        }`}
                                                >
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-200">{s.label}</p>
                                                        <p className="text-xs text-slate-600">{s.questionCount} soru · ×{s.coefficient}</p>
                                                    </div>
                                                    {(['correct', 'wrong', 'blank'] as const).map(field => (
                                                        <input
                                                            key={field}
                                                            type="number" min="0" max={s.questionCount}
                                                            value={rows[s.key][field]}
                                                            onChange={e => updateRow(s.key, field, e.target.value)}
                                                            onBlur={() => field === 'wrong' && autoBlank(s.key)}
                                                            placeholder="0"
                                                            className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        />
                                                    ))}
                                                    <div className={`text-center text-xs font-bold ${v === 'ok' ? 'text-green-400' :
                                                        v === 'over' ? 'text-red-400' :
                                                            total === 0 ? 'text-slate-600' : 'text-amber-400'
                                                        }`}>
                                                        {total === 0 ? '—' : `${total}/${s.questionCount}`}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Sıralama Bilgileri (opsiyonel, collapsible) */}
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => setShowRanking(p => !p)}
                                        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-700 transition"
                                    >
                                        <span className="text-sm font-medium text-slate-300">Sıralama Bilgileri</span>
                                        <span className="text-xs text-slate-500 ml-1">(isteğe bağlı)</span>
                                        <svg className={`w-4 h-4 ml-auto text-slate-500 transition-transform ${showRanking ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    {showRanking && (
                                        <div className="mt-2 grid grid-cols-2 gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900">
                                            {[
                                                { key: 'examAverage', label: 'Genel Ortalama', type: 'number', step: '0.01' },
                                                { key: 'classRank', label: 'Sınıf Sırası', type: 'number' },
                                                { key: 'schoolRank', label: 'Okul Sırası', type: 'number' },
                                                { key: 'districtRank', label: 'İlçe Sırası', type: 'number' },
                                                { key: 'cityRank', label: 'İl Sırası', type: 'number' },
                                                { key: 'nationalRank', label: 'Türkiye Sırası', type: 'number' },
                                                { key: 'totalParticipants', label: 'Toplam Katılımcı', type: 'number' },
                                            ].map(f => (
                                                <div key={f.key}>
                                                    <label className="block text-xs text-slate-500 mb-1">{f.label}</label>
                                                    <input
                                                        type={f.type}
                                                        min="0"
                                                        step={(f as { step?: string }).step}
                                                        value={ranking[f.key as keyof RankingRow]}
                                                        onChange={e => setRanking(prev => ({ ...prev, [f.key]: e.target.value }))}
                                                        placeholder="—"
                                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {error && (
                                    <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/30">
                                        <p className="text-red-400 text-xs">{error}</p>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button" onClick={() => setOpen(false)}
                                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit" disabled={loading}
                                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
                                    >
                                        {loading ? 'Kaydediliyor...' : 'Sınavı Kaydet'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
