'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AddStudentForm() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(false)

        const res = await fetch('/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        })

        const data = await res.json()

        if (!res.ok) {
            setError(data.error ?? 'Bir hata oluştu')
            setLoading(false)
            return
        }

        setSuccess(true)
        setName('')
        setEmail('')
        setPassword('')
        setLoading(false)
        setTimeout(() => {
            setOpen(false)
            setSuccess(false)
            router.refresh() // Server component'i yenile — liste güncellenir
        }, 1200)
    }

    return (
        <div>
            {/* Aç/Kapat Butonu */}
            <button
                onClick={() => { setOpen(!open); setError(null); setSuccess(false) }}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Öğrenci Ekle
            </button>

            {/* Form Paneli */}
            {open && (
                <div className="mt-4 bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h2 className="text-base font-semibold text-white mb-4">Yeni Öğrenci</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Ad Soyad */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Ad Soyad
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                minLength={2}
                                placeholder="Ahmet Yılmaz"
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                            />
                        </div>

                        {/* E-posta */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                E-posta
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="ogrenci@ornek.com"
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                            />
                        </div>

                        {/* Şifre */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Şifre
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                placeholder="En az 6 karakter"
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                            />
                        </div>

                        {/* Hata */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Başarı */}
                        {success && (
                            <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3">
                                <p className="text-green-400 text-sm">Öğrenci başarıyla eklendi!</p>
                            </div>
                        )}

                        {/* Butonlar */}
                        <div className="flex gap-3 pt-1">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
                            >
                                {loading ? 'Ekleniyor...' : 'Kaydet'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                            >
                                İptal
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}
