'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        if (password !== confirm) {
            setError('Şifreler eşleşmiyor.')
            return
        }
        if (password.length < 6) {
            setError('Şifre en az 6 karakter olmalıdır.')
            return
        }

        setLoading(true)
        const supabase = createClient()
        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
        })

        if (signUpError) {
            setError(signUpError.message)
            setLoading(false)
            return
        }

        setSuccess(true)
        setTimeout(() => router.push('/login'), 3000)
    }

    if (success) {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-600 mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Kayıt Başarılı!</h2>
                <p className="text-slate-400 text-sm mb-1">
                    E-posta adresinize doğrulama linki gönderildi.
                </p>
                <p className="text-slate-500 text-xs">Giriş sayfasına yönlendiriliyorsunuz...</p>
            </div>
        )
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
            {/* Header */}
            <div className="mb-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-white">Hesap Oluştur</h1>
                <p className="text-slate-400 text-sm mt-1">Veli hesabı olarak kayıt olun</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                        E-posta
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                        placeholder="ornek@email.com"
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                        Şifre
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                        placeholder="••••••••"
                    />
                </div>

                <div>
                    <label htmlFor="confirm" className="block text-sm font-medium text-slate-300 mb-1.5">
                        Şifre Tekrar
                    </label>
                    <input
                        id="confirm"
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                        autoComplete="new-password"
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                        placeholder="••••••••"
                    />
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition duration-200"
                >
                    {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
                </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-400">
                Zaten hesabınız var mı?{' '}
                <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition">
                    Giriş Yap
                </Link>
            </p>
        </div>
    )
}
