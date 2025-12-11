import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

export const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [qrMode, setQrMode] = useState(false);
    const [qrUrl, setQrUrl] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        let channel;
        if (qrMode) {
            const channelId = crypto.randomUUID();
            setQrUrl(`${window.location.origin}/qr-auth?channel=${channelId}`);

            channel = supabase.channel(`auth-${channelId}`);
            channel.on('broadcast', { event: 'session_transfer' }, async ({ payload }) => {
                if (payload.access_token && payload.refresh_token) {
                    const { error } = await supabase.auth.setSession({
                        access_token: payload.access_token,
                        refresh_token: payload.refresh_token,
                    });
                    if (!error) {
                        navigate('/');
                    }
                }
            }).subscribe();
        }
        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [qrMode, navigate]);

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
            const params = new URLSearchParams(location.search);
            const redirectTo = params.get('redirectTo');
            navigate(redirectTo ? decodeURIComponent(redirectTo) : '/');
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

                <div style={{ display: 'flex', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px' }}>
                    <button
                        type="button"
                        onClick={() => setQrMode(false)}
                        style={{ flex: 1, padding: '0.5rem', background: !qrMode ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                        E-posta
                    </button>
                    <button
                        type="button"
                        onClick={() => setQrMode(true)}
                        style={{ flex: 1, padding: '0.5rem', background: qrMode ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                        QR Kod
                    </button>
                </div>

                {qrMode ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem', animation: 'fadeIn 0.5s ease' }}>
                        <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                            {qrUrl && <QRCodeSVG value={qrUrl} size={200} />}
                        </div>
                        <p style={{ marginTop: '1.5rem', textAlign: 'center', color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5' }}>
                            Telefonunuzun kamerasını kullanarak<br />
                            bu kodu okutun ve girişi onaylayın.
                        </p>
                    </div>
                ) : (
                    <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.5s ease' }}>
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
                )}
            </div>
        </div>
    );
};
