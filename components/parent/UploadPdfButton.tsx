'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
    examId: string
    hasPdf: boolean
}

export default function UploadPdfButton({ examId, hasPdf }: Props) {
    const router = useRouter()
    const inputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [viewing, setViewing] = useState(false)

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        setError(null)

        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch(`/api/exams/${examId}/upload`, {
            method: 'POST',
            body: formData,
        })

        const data = await res.json()

        if (!res.ok) {
            setError(data.error ?? 'Yükleme başarısız')
        } else {
            router.refresh()
        }

        setUploading(false)
        // Input'u sıfırla (aynı dosyayı tekrar seçmeye izin ver)
        if (inputRef.current) inputRef.current.value = ''
    }

    async function handleView() {
        setViewing(true)
        setError(null)

        const res = await fetch(`/api/exams/${examId}/pdf`)
        const data = await res.json()

        if (!res.ok) {
            setError(data.error ?? 'PDF açılamadı')
        } else {
            // Yeni sekmede signed URL'i aç
            window.open(data.url, '_blank', 'noopener,noreferrer')
        }

        setViewing(false)
    }

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Gizli file input */}
            <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
                aria-label="PDF dosyası seç"
            />

            {/* Yükle butonu */}
            <button
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition
                    border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-400
                    disabled:opacity-40 disabled:cursor-not-allowed"
                title={hasPdf ? 'PDF\'i değiştir' : 'PDF yükle'}
            >
                {uploading ? (
                    <>
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Yükleniyor...
                    </>
                ) : (
                    <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {hasPdf ? 'PDF Değiştir' : 'PDF Yükle'}
                    </>
                )}
            </button>

            {/* Görüntüle butonu — yalnızca PDF varsa */}
            {hasPdf && (
                <button
                    onClick={handleView}
                    disabled={viewing}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition
                        border-indigo-600/50 text-indigo-400 hover:border-indigo-400 hover:bg-indigo-600/10
                        disabled:opacity-40 disabled:cursor-not-allowed"
                    title="PDF'i görüntüle"
                >
                    {viewing ? (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                    ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    )}
                    PDF Görüntüle
                </button>
            )}

            {/* Hata mesajı */}
            {error && (
                <p className="text-xs text-red-400 w-full mt-1">{error}</p>
            )}
        </div>
    )
}
