import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ViewPdfLink from '@/components/student/ViewPdfLink'
import ProgressChart from '@/components/parent/ProgressChart'
import SubjectTable from '@/components/parent/SubjectTable'
import { LGS_SUBJECTS } from '@/lib/lgs'

type Exam = {
    id: string; exam_name: string; exam_date: string
    total_score: number | null; general_rank: number | null
    city_rank: number | null; institution_rank: number | null
    institution: string | null; exam_type: string | null
    pdf_path: string | null; lgs_score: number | null
}

type SubjectResult = {
    id: string; exam_id: string; subject: string
    correct: number; wrong: number; blank: number; net: number | null
}

export default async function StudentDashboardPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: student } = await supabase
        .from('students').select('id, name').eq('user_id', user.id).single()

    const { data: exams } = student
        ? await supabase.from('exams')
            .select('id, exam_name, exam_type, institution, total_score, general_rank, city_rank, institution_rank, exam_date, pdf_path, lgs_score')
            .eq('student_id', student.id)
            .order('exam_date', { ascending: false })
        : { data: [] }

    const examList: Exam[] = exams ?? []

    let subjectResults: SubjectResult[] = []
    if (examList.length > 0 && student) {
        const { data: subjects } = await supabase
            .from('exam_subject_results')
            .select('id, exam_id, subject, correct, wrong, blank, net')
            .in('exam_id', examList.map(e => e.id))
        subjectResults = subjects ?? []
    }

    const chartData = examList
        .filter(e => e.lgs_score != null)
        .map(e => ({ exam_date: e.exam_date, exam_name: e.exam_name, lgs_score: e.lgs_score! }))
        .sort((a, b) => a.exam_date.localeCompare(b.exam_date))

    const bestRank = examList.length > 0
        ? Math.min(...examList.map(e => e.general_rank ?? Infinity).filter(isFinite))
        : null
    const bestLgs = examList.length > 0
        ? Math.max(...examList.map(e => e.lgs_score ?? -Infinity).filter(isFinite))
        : null

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-slate-400 mt-1">
                    Hoş geldiniz, <span className="text-violet-400">{student?.name ?? user.email}</span>
                </p>
            </div>

            {/* Özet Kartları */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <p className="text-slate-400 text-sm">Sınav</p>
                    <p className="mt-2 text-3xl font-bold text-white">{examList.length}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <p className="text-slate-400 text-sm">En İyi LGS Puanı</p>
                    <p className="mt-2 text-3xl font-bold text-violet-400">
                        {bestLgs != null && isFinite(bestLgs) ? bestLgs.toFixed(1) : '—'}
                    </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <p className="text-slate-400 text-sm">Son LGS Puanı</p>
                    <p className="mt-2 text-3xl font-bold text-white">
                        {examList[0]?.lgs_score?.toFixed(1) ?? '—'}
                    </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <p className="text-slate-400 text-sm">En İyi Genel Sıra</p>
                    <p className="mt-2 text-3xl font-bold text-white">
                        {bestRank != null && isFinite(bestRank) ? bestRank : '—'}
                    </p>
                </div>
            </div>

            {/* Sınav Listesi */}
            <h2 className="text-lg font-semibold text-white mb-4">Sınavlarım</h2>

            {examList.length === 0 ? (
                <div className="bg-slate-900 border border-dashed border-slate-700 rounded-xl p-12 text-center">
                    <p className="text-slate-500 text-sm">Henüz sınav sonucu girilmedi</p>
                    <p className="text-slate-600 text-xs mt-1">Velinin sınav eklemesi bekleniyor</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {examList.map(exam => {
                        const examSubjects = subjectResults.filter(sr => sr.exam_id === exam.id)

                        return (
                            <div key={exam.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-white font-medium">{exam.exam_name}</p>
                                            {exam.exam_type && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-400 border border-violet-600/30">
                                                    {exam.exam_type}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-slate-500 text-xs mt-0.5">
                                            {new Date(exam.exam_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            {exam.institution && ` · ${exam.institution}`}
                                        </p>
                                    </div>
                                    {exam.lgs_score != null && (
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-xs text-slate-500">LGS Puanı</p>
                                            <p className="text-xl font-bold text-violet-400">{exam.lgs_score.toFixed(2)}</p>
                                        </div>
                                    )}
                                </div>

                                {(exam.general_rank != null || exam.city_rank != null) && (
                                    <div className="flex gap-4 flex-wrap mb-2">
                                        {exam.general_rank != null && <span className="text-sm text-slate-300"><span className="text-slate-500 text-xs">Genel </span><strong>{exam.general_rank}</strong></span>}
                                        {exam.city_rank != null && <span className="text-sm text-slate-300"><span className="text-slate-500 text-xs">İl </span><strong>{exam.city_rank}</strong></span>}
                                    </div>
                                )}

                                {examSubjects.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-slate-800">
                                        <SubjectTable subjects={examSubjects} />
                                    </div>
                                )}

                                {exam.pdf_path && (
                                    <div className="mt-3 pt-3 border-t border-slate-800">
                                        <ViewPdfLink examId={exam.id} />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* LGS Puan Grafiği — sınav listesinin altında */}
            {chartData.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-white mb-4">LGS Puan Gelişimi</h2>
                    <ProgressChart data={chartData} />
                </div>
            )}
        </div>
    )
}
