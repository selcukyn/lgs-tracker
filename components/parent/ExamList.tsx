'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import UploadPdfButton from '@/components/parent/UploadPdfButton'
import SubjectTable from '@/components/parent/SubjectTable'
import EditExamModal from '@/components/parent/EditExamModal'
import { LGS_SUBJECTS, SUBJECT_MAP, formatScore } from '@/lib/lgs'

type Exam = {
    id: string; exam_name: string; exam_date: string
    total_score: number | null; national_rank: number | null
    city_rank: number | null; school_rank: number | null
    district_rank: number | null; class_rank: number | null
    institution: string | null; exam_type: string | null
    pdf_path: string | null; lgs_score: number | null
    exam_average: number | null; total_participants: number | null
}

type SubjectResult = {
    id: string; exam_id: string; subject: string
    correct: number; wrong: number; blank: number; net: number | null
}

type Props = {
    studentId: string
    studentName: string
    exams: Exam[]
    subjectResults: SubjectResult[]
}

export default function ExamList({ studentId, studentName, exams: serverExams, subjectResults }: Props) {
    const router = useRouter()
    const [exams, setExams] = useState<Exam[]>(serverExams)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
    const [expandedExamId, setExpandedExamId] = useState<string | null>(null)
    const [editingExam, setEditingExam] = useState<Exam | null>(null)

    // Fix #4: Sync local state when server re-renders with new data after router.refresh()
    useEffect(() => {
        setExams(serverExams)
    }, [serverExams])

    async function handleDelete(examId: string) {
        setDeletingId(examId)
        setConfirmingDeleteId(null)

        const res = await fetch(`/api/exams/${examId}`, { method: 'DELETE' })

        if (res.ok) {
            setExams(prev => prev.filter(e => e.id !== examId))
            if (expandedExamId === examId) setExpandedExamId(null)
            router.refresh()
        } else {
            const data = await res.json()
            setDeletingId(null)
            // Show error inline instead of alert()
            console.error('Sınav silinemedi:', data.error)
        }
        setDeletingId(null)
    }

    if (exams.length === 0) {
        return (
            <div className="bg-slate-900 border border-dashed border-slate-700 rounded-xl p-8 text-center">
                <p className="text-slate-500 text-sm">{studentName} için henüz sınav girilmedi</p>
            </div>
        )
    }

    return (
        <>
            <div className="space-y-3">
                {exams.map(exam => {
                    const examSubjects = subjectResults.filter(sr => sr.exam_id === exam.id)
                    const isExpanded = expandedExamId === exam.id

                    let strongestSubject: string | null = null
                    let weakestSubject: string | null = null
                    if (examSubjects.length > 0) {
                        let maxWeighted = -Infinity
                        let minWeighted = Infinity
                        examSubjects.forEach(s => {
                            if (s.net != null) {
                                const coeff = LGS_SUBJECTS.find(def => def.key === s.subject)?.coefficient || 1
                                const weightedScore = s.net * coeff
                                if (weightedScore > maxWeighted) { maxWeighted = weightedScore; strongestSubject = s.subject }
                                if (weightedScore < minWeighted) { minWeighted = weightedScore; weakestSubject = s.subject }
                            }
                        })
                        // If all are 0 or equal, max and min will be the same. 
                        if (maxWeighted === minWeighted) {
                            strongestSubject = null
                            weakestSubject = null
                        }
                    }

                    let percentile: number | null = null
                    if (exam.national_rank && exam.total_participants) {
                        percentile = (exam.national_rank / exam.total_participants) * 100
                    }

                    return (
                        <div key={exam.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                            {/* Header */}
                            <div className="p-4 flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-white font-medium">{exam.exam_name}</p>
                                        {exam.exam_type && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-600/30">
                                                {exam.exam_type}
                                            </span>
                                        )}
                                        {exam.lgs_score != null && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-bold">
                                                LGS {formatScore(exam.lgs_score)}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-slate-500 text-xs mt-1">
                                        {new Date(exam.exam_date).toLocaleDateString('tr-TR', {
                                            day: 'numeric', month: 'long', year: 'numeric'
                                        })}
                                        {exam.institution && ` · ${exam.institution}`}
                                    </p>
                                    <div className="flex gap-4 mt-2 flex-wrap">
                                        {percentile != null && <span className="text-sm text-slate-300"><span className="text-slate-500 text-xs">Yüzdelik </span><strong className="text-indigo-400">%{formatScore(percentile)}</strong></span>}
                                        {exam.national_rank != null && <span className="text-sm text-slate-300"><span className="text-slate-500 text-xs">Türkiye </span><strong>{exam.national_rank}</strong></span>}
                                        {exam.city_rank != null && <span className="text-sm text-slate-300"><span className="text-slate-500 text-xs">İl </span><strong>{exam.city_rank}</strong></span>}
                                        {exam.district_rank != null && <span className="text-sm text-slate-300"><span className="text-slate-500 text-xs">İlçe </span><strong>{exam.district_rank}</strong></span>}
                                        {exam.school_rank != null && <span className="text-sm text-slate-300"><span className="text-slate-500 text-xs">Okul </span><strong>{exam.school_rank}</strong></span>}
                                        {exam.class_rank != null && <span className="text-sm text-slate-300"><span className="text-slate-500 text-xs">Sınıf </span><strong>{exam.class_rank}</strong></span>}
                                        {exam.exam_average != null && <span className="text-sm text-slate-300"><span className="text-slate-500 text-xs">Ort. </span><strong>{formatScore(exam.exam_average)}</strong></span>}

                                        {strongestSubject && <span className="text-sm text-slate-300 ml-auto border-l border-slate-700 pl-4"><span className="text-slate-500 text-xs">En Güçlü </span><strong className="text-emerald-400">{SUBJECT_MAP[strongestSubject as keyof typeof SUBJECT_MAP].label}</strong></span>}
                                        {weakestSubject && <span className="text-sm text-slate-300"><span className="text-slate-500 text-xs">En Zayıf </span><strong className="text-rose-400">{SUBJECT_MAP[weakestSubject as keyof typeof SUBJECT_MAP].label}</strong></span>}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex-shrink-0 flex items-center gap-1">
                                    {/* Ders toggle */}
                                    {examSubjects.length > 0 && (
                                        <button
                                            onClick={() => setExpandedExamId(isExpanded ? null : exam.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-400"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                            Dersler
                                            <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    )}

                                    {/* Düzenle */}
                                    <button
                                        onClick={() => setEditingExam(exam)}
                                        className="p-2 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition"
                                        title="Sınavı düzenle"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>

                                    <UploadPdfButton examId={exam.id} hasPdf={!!exam.pdf_path} />

                                    {/* Sil */}
                                    {confirmingDeleteId === exam.id ? (
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-900/20 border border-red-700/40">
                                            <span className="text-xs text-red-400 mr-1">Emin misin?</span>
                                            <button
                                                onClick={() => handleDelete(exam.id)}
                                                disabled={deletingId === exam.id}
                                                className="px-2 py-1 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded transition disabled:opacity-50"
                                            >
                                                {deletingId === exam.id ? '...' : 'Evet'}
                                            </button>
                                            <button
                                                onClick={() => setConfirmingDeleteId(null)}
                                                className="px-2 py-1 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition"
                                            >
                                                İptal
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmingDeleteId(exam.id)}
                                            disabled={deletingId === exam.id}
                                            className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-40"
                                            title="Sınavı sil"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Ders tablosu (collapsible) */}
                            {isExpanded && examSubjects.length > 0 && (
                                <div className="px-4 pb-4 border-t border-slate-800">
                                    <div className="mt-3">
                                        <SubjectTable subjects={examSubjects} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Edit Modal */}
            {editingExam && (
                <EditExamModal
                    examId={editingExam.id}
                    initialData={{
                        examName: editingExam.exam_name,
                        examDate: editingExam.exam_date,
                        examType: editingExam.exam_type,
                        institution: editingExam.institution,
                        subjects: subjectResults.filter(s => s.exam_id === editingExam.id),
                        examAverage: editingExam.exam_average ?? null,
                        classRank: editingExam.class_rank ?? null,
                        schoolRank: editingExam.school_rank ?? null,
                        districtRank: editingExam.district_rank ?? null,
                        cityRank: editingExam.city_rank ?? null,
                        nationalRank: editingExam.national_rank ?? null,
                        totalParticipants: editingExam.total_participants ?? null,
                    }} onClose={() => setEditingExam(null)}
                />
            )}
        </>
    )
}
