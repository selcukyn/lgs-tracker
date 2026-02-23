'use client'

import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

type LgsDataPoint = {
    exam_date: string
    exam_name: string
    lgs_score: number
}

type Props = {
    data: LgsDataPoint[]
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'short'
    })
}

export default function ProgressChart({ data }: Props) {
    if (data.length === 0) {
        return (
            <div className="bg-slate-900 border border-dashed border-slate-700 rounded-xl p-8 text-center">
                <p className="text-slate-500 text-sm">
                    Grafik için en az bir sınava ders sonucu girilmesi gerekiyor
                </p>
            </div>
        )
    }

    const chartData = [...data]
        .sort((a, b) => a.exam_date.localeCompare(b.exam_date))
        .map(d => ({
            date: formatDate(d.exam_date),
            'LGS Puanı': d.lgs_score,
            name: d.exam_name,
        }))

    const scores = data.map(d => d.lgs_score)
    const minScore = Math.min(...scores)
    const maxScore = Math.max(...scores)
    const yMin = Math.max(200, Math.floor((minScore - 10) / 10) * 10)
    const yMax = Math.min(500, Math.ceil((maxScore + 10) / 10) * 10)

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">LGS Puan Gelişimi</h3>
                {data.length >= 2 && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${scores[scores.length - 1] >= scores[0]
                            ? 'bg-green-600/20 text-green-400 border-green-600/30'
                            : 'bg-red-600/20 text-red-400 border-red-600/30'
                        }`}>
                        {scores[scores.length - 1] >= scores[0] ? '▲' : '▼'}{' '}
                        {Math.abs(scores[scores.length - 1] - scores[0]).toFixed(1)} puan
                    </span>
                )}
            </div>
            <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                        dataKey="date"
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        axisLine={{ stroke: '#334155' }}
                        tickLine={false}
                    />
                    <YAxis
                        domain={[yMin, yMax]}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        axisLine={{ stroke: '#334155' }}
                        tickLine={false}
                        width={40}
                    />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (!active || !payload?.length) return null
                            const p = payload[0].payload
                            return (
                                <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs">
                                    <p className="text-slate-400 mb-1">{p.name}</p>
                                    <p className="text-indigo-400 font-bold text-base">{p['LGS Puanı'].toFixed(2)}</p>
                                </div>
                            )
                        }}
                    />
                    <ReferenceLine y={400} stroke="#334155" strokeDasharray="4 4" label={{ value: '400', fill: '#475569', fontSize: 10, position: 'right' }} />
                    <Line
                        type="monotone"
                        dataKey="LGS Puanı"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        dot={{ r: 5, fill: '#6366f1', strokeWidth: 0 }}
                        activeDot={{ r: 7, fill: '#818cf8' }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
