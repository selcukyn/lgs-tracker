import { LGS_SUBJECTS } from '@/lib/lgs'

type SubjectResult = {
    id: string
    subject: string
    correct: number
    wrong: number
    blank: number
    net: number | null
}

const SUBJECT_COLOR: Record<string, string> = {
    'Türkçe': 'text-emerald-400',
    'Matematik': 'text-blue-400',
    'Fen': 'text-purple-400',
    'İnkılap': 'text-amber-400',
    'Din': 'text-rose-400',
    'İngilizce': 'text-cyan-400',
}

type Props = {
    subjects: SubjectResult[]
}

export default function SubjectTable({ subjects }: Props) {
    if (subjects.length === 0) return null

    // LGS sıralamasında göster
    const ordered = LGS_SUBJECTS
        .map(def => subjects.find(s => s.subject === def.key))
        .filter(Boolean) as SubjectResult[]

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                        <th className="text-left py-1.5 pr-3 font-medium">Ders</th>
                        <th className="text-right py-1.5 px-2 font-medium text-green-400">D</th>
                        <th className="text-right py-1.5 px-2 font-medium text-red-400">Y</th>
                        <th className="text-right py-1.5 px-2 font-medium text-slate-500">B</th>
                        <th className="text-right py-1.5 px-2 font-medium text-indigo-400">Net</th>
                    </tr>
                </thead>
                <tbody>
                    {ordered.map(s => (
                        <tr key={s.id} className="border-b border-slate-800/50">
                            <td className={`py-2 pr-3 font-medium ${SUBJECT_COLOR[s.subject] ?? 'text-slate-300'}`}>
                                {s.subject}
                            </td>
                            <td className="text-right py-2 px-2 text-green-400">{s.correct}</td>
                            <td className="text-right py-2 px-2 text-red-400">{s.wrong}</td>
                            <td className="text-right py-2 px-2 text-slate-500">{s.blank}</td>
                            <td className="text-right py-2 px-2 font-bold text-white">
                                {s.net != null ? Number(s.net).toFixed(2) : '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
