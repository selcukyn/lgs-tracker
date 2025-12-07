import React, { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

export const Login = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!supabase) {
            alert('Supabase bağlantısı eksik! Lütfen .env dosyasını kontrol edin.');
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            alert(error.message);
        } else {
            navigate('/');
        }
        setLoading(false);
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!supabase) {
            alert('Supabase bağlantısı eksik!');
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            alert(error.message);
        } else {
            alert('Kayıt başarılı! Giriş yapabilirsiniz.');
        }
        setLoading(false);
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at top right, #1e1b4b, #0f172a)'
        }}>
            <div className="glass-panel" style={{ padding: '3rem', width: '100%', maxWidth: '400px' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center', fontWeight: 'bold' }}>LGS Takip</h1>

                <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label htmlFor="login-email" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>E-posta</label>
                        <input
                            className="input-field"
                            id="login-email"
                            name="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white' }}
                        />
                    </div>
                    <div>
                        <label htmlFor="login-password" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Şifre</label>
                        <input
                            className="input-field"
                            id="login-password"
                            name="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button
                            onClick={handleLogin}
                            disabled={loading}
                            className="btn btn-primary"
                            style={{ flex: 1, justifyContent: 'center' }}
                        >
                            {loading ? '...' : 'Giriş Yap'}
                        </button>
                        <button
                            onClick={handleSignUp}
                            disabled={loading}
                            className="btn"
                            style={{ flex: 1, justifyContent: 'center', background: 'rgba(255,255,255,0.1)' }}
                        >
                            Kayıt Ol
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
