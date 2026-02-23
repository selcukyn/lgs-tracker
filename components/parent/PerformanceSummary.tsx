'use client'

import { SUBJECT_MAP, formatScore } from '@/lib/lgs'
import { StudentAnalytics } from '@/lib/analytics'

type Props = {
    analytics: StudentAnalytics | null
}

export default function PerformanceSummary({ analytics }: Props) {
    if (!analytics) return null

    let trendNode = null
    if (analytics.trend.last3Exams.length >= 2) {
        const lastIndex = analytics.trend.last3Exams.length - 1
        const latest = analytics.trend.last3Exams[lastIndex]
        const previous = analytics.trend.last3Exams[lastIndex - 1]
        const isUp = analytics.trend.direction === 'up'
        const isDown = analytics.trend.direction === 'down'

        trendNode = (
            <div className="mt-2">
                <p className="text-sm text-slate-400 mb-1">Son Sınav: <strong className="text-white">{formatScore(latest.score)}</strong></p>
                <div className="flex items-center gap-2">
                    {isUp && <span className="text-green-400 font-bold text-lg">↑ +{formatScore(analytics.trend.delta)}</span>}
                    {isDown && <span className="text-red-400 font-bold text-lg">↓ {formatScore(Math.abs(analytics.trend.delta))}</span>}
                    {!isUp && !isDown && <span className="text-slate-400 font-bold text-lg">— Değişim Yok</span>}
                    <span className="text-xs text-slate-500">(Önceki: {formatScore(previous.score)})</span>
                </div>
            </div>
        )
    } else if (analytics.trend.last3Exams.length === 1) {
        trendNode = (
            <div className="mt-2">
                <p className="text-sm text-slate-400">Son Sınav: <strong className="text-white">{formatScore(analytics.trend.last3Exams[0].score)}</strong></p>
                <p className="text-xs text-slate-500 mt-1">Trend için en az 2 sınav gerekli.</p>
            </div>
        )
    } else {
        trendNode = <p className="text-sm text-slate-500 mt-2">Henüz sınav girilmedi.</p>
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Sınıflandırma Kartı */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white border-b border-slate-800 pb-2 mb-3">Performans</h3>
                <div className="mt-2">
                    {analytics.classification ? (
                        <>
                            <strong className={`text-xl ${analytics.classification.color}`}>{analytics.classification.label}</strong>
                            {analytics.percentile != null && (
                                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                                    Türkiye genelinde {analytics.percentile < 0.01 ? "%0.01'den küçük" : `%${formatScore(analytics.percentile)}`} dilimdesiniz.
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-slate-500">Hesaplanamadı</p>
                    )}
                </div>
            </div>

            {/* LGS Trend Kartı */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white border-b border-slate-800 pb-2 mb-3">LGS Puan Trendi</h3>
                {trendNode}
            </div>

            {/* Güçlü/Zayıf Dersler */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white border-b border-slate-800 pb-2 mb-3">Güçlü & Zayıf Ders Analizi</h3>
                <div className="mt-2 space-y-3">
                    <div>
                        <span className="text-xs text-slate-500 block mb-1">En Yüksek Katkı:</span>
                        {analytics.strongestSubject ? (
                            <strong className="text-emerald-400 text-sm">
                                {SUBJECT_MAP[analytics.strongestSubject.name as keyof typeof SUBJECT_MAP]?.label || analytics.strongestSubject.name}
                            </strong>
                        ) : (
                            <span className="text-slate-500 text-sm">—</span>
                        )}
                    </div>
                    <div>
                        <span className="text-xs text-slate-500 block mb-1">En Düşük Katkı:</span>
                        {analytics.weakestSubject ? (
                            <strong className="text-rose-400 text-sm">
                                {SUBJECT_MAP[analytics.weakestSubject.name as keyof typeof SUBJECT_MAP]?.label || analytics.weakestSubject.name}
                            </strong>
                        ) : (
                            <span className="text-slate-500 text-sm">—</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Ortalama Netler Kartı */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white border-b border-slate-800 pb-2 mb-3">Tüm Sınavlar Ortalama Net</h3>
                {analytics.averageNets.length > 0 ? (
                    <div className="grid grid-cols-1 gap-y-1.5">
                        {analytics.averageNets.map((calc, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-slate-800/50 rounded px-2 py-1">
                                <span className="text-xs text-slate-300">{SUBJECT_MAP[calc.subject as keyof typeof SUBJECT_MAP]?.label || calc.subject}</span>
                                <strong className="text-sm text-white">{formatScore(calc.average)}</strong>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 mt-2">Henüz net verisi yok.</p>
                )}
            </div>
        </div>
    )
}
