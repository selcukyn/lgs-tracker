import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, PieChart, Pie } from 'recharts';
import { Filter, AlertTriangle, CheckCircle, Target } from 'lucide-react';

export const Analysis = () => {
    const { dailyLogs, subjects, userRole, selectedStudent } = useData();
    const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.name || 'Matematik');

    // Analiz Verilerini Hesapla
    const analysisData = useMemo(() => {
        if (!dailyLogs || dailyLogs.length === 0) return [];

        // 1. Seçilen derse göre filtrele
        const filteredLogs = dailyLogs.filter(log => log.subject === selectedSubject);

        // 2. Konulara göre grupla
        const topicMap = {};

        filteredLogs.forEach(log => {
            // Konu boşsa "Belirsiz" olarak işaretle
            const topic = log.topic ? log.topic.trim() : 'Genel Tekrar';

            if (!topicMap[topic]) {
                topicMap[topic] = {
                    name: topic,
                    total: 0,
                    correct: 0,
                    incorrect: 0
                };
            }

            topicMap[topic].total += parseInt(log.count || 0);
            topicMap[topic].correct += parseInt(log.correct || 0);
            topicMap[topic].incorrect += (parseInt(log.count || 0) - parseInt(log.correct || 0));
        });

        // 3. İstatistikleri hesapla ve diziye çevir
        return Object.values(topicMap).map(item => ({
            ...item,
            successRate: item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0
        })).sort((a, b) => b.total - a.total); // En çok soru çözülene göre sırala

    }, [dailyLogs, selectedSubject]);

    // En iyi ve en kötü konu
    const bestTopic = analysisData.length > 0
        ? [...analysisData].sort((a, b) => b.successRate - a.successRate)[0]
        : null;

    const worstTopic = analysisData.length > 0
        ? [...analysisData].filter(t => t.total > 10).sort((a, b) => a.successRate - b.successRate)[0]
        : null; // En az 10 soru çözülmüş olmalı ki "kötü" diyebilelim

    // Guard: Admin/Teacher Context
    if (['admin', 'teacher'].includes(userRole) && !selectedStudent) {
        return (
            <div style={{
                height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '1rem'
            }}>
                <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', textAlign: 'center' }}>
                    <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>Öğrenci Seçilmedi</h3>
                    <p>Analizleri görmek için lütfen sol menüden bir öğrenci seçiniz.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div>
                <h2 style={{ fontSize: '1.875rem', fontWeight: '700' }}>Konu Analizi</h2>
                <p style={{ color: 'var(--text-muted)' }}>Hangi konularda iyisin, hangilerine çalışmalısın?</p>
            </div>

            {/* Filters */}
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', overflowX: 'auto' }}>
                <Filter size={20} color="var(--color-primary)" />
                <span style={{ fontWeight: 500 }}>Ders Seçimi:</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {subjects.map(sub => (
                        <button
                            key={sub.name}
                            onClick={() => setSelectedSubject(sub.name)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                border: selectedSubject === sub.name ? `1px solid ${sub.color}` : '1px solid transparent',
                                backgroundColor: selectedSubject === sub.name ? `${sub.color}20` : 'rgba(255,255,255,0.05)',
                                color: selectedSubject === sub.name ? sub.color : 'var(--text-muted)',
                                cursor: 'pointer',
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s'
                            }}
                        >
                            {sub.name}
                        </button>
                    ))}
                </div>
            </div>

            {analysisData.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ marginBottom: '1rem' }}><Target size={48} opacity={0.5} /></div>
                    <h3>Veri Bulunamadı</h3>
                    <p>Bu ders için henüz yeterli veri girişi yapılmamış.</p>
                </div>
            ) : (
                <>
                    {/* Insights Cards */}
                    <div className="kpi-grid">
                        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #10b981' }}>
                            <div style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>En Başarılı Konu</div>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{bestTopic?.name || '-'}</div>
                                <div style={{ fontSize: '0.875rem', color: '#10b981' }}>%{bestTopic?.successRate || 0} Başarı</div>
                            </div>
                        </div>

                        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #ef4444' }}>
                            <div style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Geliştirilmesi Gereken</div>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{worstTopic?.name || 'Veri Yetersiz'}</div>
                                <div style={{ fontSize: '0.875rem', color: '#ef4444' }}>%{worstTopic?.successRate || 0} Başarı</div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="content-grid">
                        {/* Bar Chart - Question Counts */}
                        <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '400px' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Konu Bazlı Soru Dağılımı</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={analysisData} layout="vertical" margin={{ left: 40, right: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                                    <XAxis type="number" stroke="var(--text-muted)" />
                                    <YAxis dataKey="name" type="category" width={120} stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-color)', borderRadius: '12px' }}
                                        itemStyle={{ color: 'white' }}
                                    />
                                    <Bar dataKey="total" name="Toplam Soru" fill="var(--color-primary)" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Success Rate List */}
                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Başarı Detayları</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                                {analysisData.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                            <span style={{ fontWeight: 500 }}>{item.name}</span>
                                            <span style={{ color: item.successRate >= 70 ? '#10b981' : item.successRate >= 50 ? '#f59e0b' : '#ef4444' }}>
                                                %{item.successRate}
                                            </span>
                                        </div>
                                        {/* Progress Bar */}
                                        <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%',
                                                width: `${item.successRate}%`,
                                                background: item.successRate >= 70 ? '#10b981' : item.successRate >= 50 ? '#f59e0b' : '#ef4444',
                                                borderRadius: '3px',
                                                transition: 'width 0.5s ease-out'
                                            }} />
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                                            {item.correct} Doğru / {item.total} Soru
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
