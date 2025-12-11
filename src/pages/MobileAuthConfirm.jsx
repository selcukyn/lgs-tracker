import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useData } from '../context/DataContext';

export const MobileAuthConfirm = () => {
    const [searchParams] = useSearchParams();
    const channelId = searchParams.get('channel');
    const { user, loading } = useData();
    const navigate = useNavigate();
    const [status, setStatus] = useState('pending'); // pending, sending, success, error

    useEffect(() => {
        if (!loading && !user) {
            // Kullanıcı telefonda login değilse login sayfasına yönlendir, işlem bitince geri gelsin
            // encodeURIComponent tekniği ile URL'i koru
            const returnUrl = encodeURIComponent(`/qr-auth?channel=${channelId}`);
            navigate(`/login?redirectTo=${returnUrl}`);
        }
    }, [user, loading, navigate, channelId]);

    const handleConfirm = async () => {
        if (!channelId || !user) return;
        setStatus('sending');

        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;

            if (!session) {
                throw new Error('Oturum bilgisi bulunamadı');
            }

            const channel = supabase.channel(`auth-${channelId}`);

            channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.send({
                        type: 'broadcast',
                        event: 'session_transfer',
                        payload: {
                            access_token: session.access_token,
                            refresh_token: session.refresh_token,
                        },
                    });

                    setTimeout(() => {
                        supabase.removeChannel(channel);
                    }, 2000);
                    setStatus('success');
                }
            });

        } catch (error) {
            console.error('Auth transfer error:', error);
            setStatus('error');
        }
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>Yükleniyor...</div>;
    if (!user) return null; // Redirecting...

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at center, #1e1b4b, #0f172a)',
            color: 'white',
            padding: '1rem'
        }}>
            <div className="glass-panel" style={{
                padding: '2rem',
                textAlign: 'center',
                maxWidth: '400px',
                width: '100%',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: '600' }}>Giriş Onayı</h2>

                {status === 'pending' && (
                    <>
                        <p style={{ marginBottom: '2rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                            Masaüstü cihazınızda oturum açmak istiyor musunuz?
                        </p>
                        <button
                            onClick={handleConfirm}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '1rem'
                            }}
                        >
                            Onayla
                        </button>
                    </>
                )}

                {status === 'sending' && <p>İletiliyor...</p>}

                {status === 'success' && (
                    <div style={{ color: '#4ade80' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
                        <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Başarılı!</p>
                        <p style={{ color: '#cbd5e1' }}>Masaüstü ekranınız şimdi açılacak.</p>
                    </div>
                )}

                {status === 'error' && (
                    <div style={{ color: '#ef4444' }}>
                        <p style={{ marginBottom: '1rem' }}>Bağlantı hatası oluştu.</p>
                        <button
                            onClick={() => setStatus('pending')}
                            style={{
                                padding: '0.5rem 1rem',
                                background: 'transparent',
                                border: '1px solid #ef4444',
                                color: '#ef4444',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            Tekrar Dene
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
