'use client'

import { useState } from 'react'

type Props = {
    examId: string
}

export default function ViewPdfLink({ examId }: Props) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleClick() {
        setLoading(true)
        setError(null)

        const res = await fetch(`/api/exams/${examId}/pdf`)
        const data = await res.json()

        if (!res.ok) {
            setError(data.error ?? 'PDF açılamadı')
        } else {
            window.open(data.url, '_blank', 'noopener,noreferrer')
        }

        setLoading(false)
    }

    return (
        <div>
            <button
                onClick={handleClick}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 transition disabled:opacity-40"
            >
                {loading ? (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                )}
                {loading ? 'Açılıyor...' : 'PDF Görüntüle'}
            </button>
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
    )
}
