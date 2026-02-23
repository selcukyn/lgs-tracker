import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AddStudentForm from '@/components/parent/AddStudentForm'
import AddExamForm from '@/components/parent/AddExamForm'
import ExamList from '@/components/parent/ExamList'
import ProgressChart from '@/components/parent/ProgressChart'
import PerformanceSummary from '@/components/parent/PerformanceSummary'
import { StudentAnalytics } from '@/lib/analytics'
import { formatScore } from '@/lib/lgs'
import { headers } from 'next/headers'

type Student = { id: string; name: string; created_at: string }

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
    question_count: number | null; correct: number; wrong: number
    blank: number; net: number | null; success_percentage: number | null
}

export default async function ParentDashboardPage({
    searchParams,
}: {
    searchParams: { studentId?: string }
}) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: students } = await supabase
        .from('students').select('id, name, created_at')
        .eq('parent_id', user.id).order('created_at', { ascending: true })

    const studentList: Student[] = students ?? []

    const requestedStudentId = searchParams.studentId
    const selectedStudent = requestedStudentId
        ? studentList.find(s => s.id === requestedStudentId) ?? null
        : (studentList[0] ?? null)

    let examList: Exam[] = []
    let subjectResults: SubjectResult[] = []
    let analytics: StudentAnalytics | null = null

    if (selectedStudent) {
        const { data: exams } = await supabase
            .from('exams')
            .select('id, exam_name, exam_type, institution, total_score, national_rank, school_rank, city_rank, district_rank, class_rank, exam_average, total_participants, exam_date, pdf_path, lgs_score')
            .eq('student_id', selectedStudent.id)
            .order('exam_date', { ascending: false })
        examList = exams ?? []

        if (examList.length > 0) {
            const { data: subjects } = await supabase
                .from('exam_subject_results')
                .select('id, exam_id, subject, question_count, correct, wrong, blank, net, success_percentage')
                .in('exam_id', examList.map(e => e.id))
                .order('subject', { ascending: true })
            subjectResults = subjects ?? []
        }

        // Fetch Analytics from the Single Source of Truth API
        const headersList = headers()
        const host = headersList.get('host') || 'localhost:3000'
        const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'

        try {
            const res = await fetch(`${protocol}://${host}/api/analytics?studentId=${selectedStudent.id}`, {
                headers: {
                    cookie: headersList.get('cookie') || ''
                },
                cache: 'no-store'
            })

            if (res.ok) {
                analytics = await res.json()
                console.log("API TEST -> Analytics latestScore:", analytics?.latestScore, " | UI ExamList[0] score:", examList[0]?.lgs_score)
            } else {
                console.error("Analytics fetch error:", await res.text())
            }
        } catch (error) {
            console.error("Network error fetching analytics:", error)
        }
    }

    // LGS puan grafiği için: yalnızca lgs_score olan sınavlar
    const chartData = examList
        .filter(e => e.lgs_score != null)
        .map(e => ({ exam_date: e.exam_date, exam_name: e.exam_name, lgs_score: e.lgs_score! }))
        .sort((a, b) => a.exam_date.localeCompare(b.exam_date))

    const bestRank = examList.length > 0
        ? Math.min(...examList.map(e => e.national_rank ?? Infinity).filter(isFinite))
        : null

    const bestLgs = examList.length > 0
        ? Math.max(...examList.map(e => e.lgs_score ?? -Infinity).filter(isFinite))
        : null

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-slate-400 mt-1">
                    Hoş geldiniz, <span className="text-indigo-400">{user.email}</span>
                </p>
            </div>

            {/* Özet Kartları */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <p className="text-slate-400 text-sm">Öğrenci</p>
                    <p className="mt-2 text-3xl font-bold text-white">{studentList.length}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <p className="text-slate-400 text-sm">Sınav</p>
                    <p className="mt-2 text-3xl font-bold text-white">{examList.length}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <p className="text-slate-400 text-sm">En İyi LGS Puanı</p>
                    <p className="mt-2 text-3xl font-bold text-indigo-400">
                        {bestLgs != null && isFinite(bestLgs) ? formatScore(bestLgs) : '—'}
                    </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <p className="text-slate-400 text-sm">En İyi Genel Sıra</p>
                    <p className="mt-2 text-3xl font-bold text-white">
                        {bestRank != null && isFinite(bestRank) ? bestRank : '—'}
                    </p>
                </div>
            </div>

            {selectedStudent && (
                <PerformanceSummary analytics={analytics} />
            )}

            {/* Öğrenci Sekmeleri */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">Öğrencilerim</h2>
                    <AddStudentForm />
                </div>
                {studentList.length === 0 ? (
                    <div className="bg-slate-900 border border-dashed border-slate-700 rounded-xl p-10 text-center">
                        <p className="text-slate-500 text-sm">Henüz öğrenci eklenmedi</p>
                    </div>
                ) : (
                    <div className="flex gap-2 flex-wrap">
                        {studentList.map(student => (
                            <a key={student.id}
                                href={`/parent/dashboard?studentId=${student.id}`}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${selectedStudent?.id === student.id
                                    ? 'bg-indigo-600 border-indigo-500 text-white'
                                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-indigo-500 hover:text-white'
                                    }`}
                            >
                                {student.name}
                            </a>
                        ))}
                    </div>
                )}
            </div>

            {/* Seçili Öğrenci Paneli */}
            {selectedStudent && (
                <div className="space-y-8">
                    {/* Sınav Listesi */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white">
                                {selectedStudent.name} — Sınavlar
                            </h2>
                            <AddExamForm studentId={selectedStudent.id} studentName={selectedStudent.name} />
                        </div>
                        <ExamList
                            studentId={selectedStudent.id}
                            studentName={selectedStudent.name}
                            exams={examList}
                            subjectResults={subjectResults}
                        />
                    </div>

                    {/* LGS Puan Grafiği */}
                    {chartData.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-white mb-4">
                                {selectedStudent.name} — LGS Puan Gelişimi
                            </h2>
                            <ProgressChart data={chartData} />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
