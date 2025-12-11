import React from 'react';
import { useData } from '../context/DataContext';
import { KPICard } from '../components/KPICard';
import { Target, TrendingUp, Calendar, CheckCircle } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export const Dashboard = () => {
    const { stats, dailyLogs, examHistory } = useData();

    // Process Last 7 Days for Chart
    const getLast7Days = () => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(d.toISOString().split('T')[0]);
        }
        return days;
    };

    const chartData = getLast7Days().map(date => {
        const total = (dailyLogs || [])
            .filter(l => l.date === date)
            .reduce((acc, curr) => acc + (parseInt(curr.count) || 0), 0);

        // Format date to Day Name (e.g. Pzt)
        const dateObj = new Date(date);
        const dayName = dateObj.toLocaleDateString('tr-TR', { weekday: 'short' });

        return { name: dayName, questions: total };
    });

    // Recent Activities (Merge Exams & Logs)
    const recentActivities = [
        ...(examHistory || []).map(e => ({
            type: 'exam',
            date: e.date,
            title: e.name,
            score: e.totalScore ? `${Number(e.totalScore).toFixed(0)} Puan` : '0 Puan'
        })),
        ...(dailyLogs || []).map(l => ({
            type: 'log',
            date: l.date,
            title: `${l.subject} Soru Çözümü`,
            score: `${l.count} Soru`
        }))
    ]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div>
                <h2 style={{ fontSize: '1.875rem', fontWeight: '700' }}>Genel Bakış</h2>
                <p style={{ color: 'var(--text-muted)' }}>Sınav hazırlık sürecindeki son durum.</p>
            </div>

            {/* KPIs */}
            <div className="kpi-grid">
                <KPICard
                    title="Toplam Soru"
                    value={stats.totalQuestions}
                    icon={Target}
                    color="var(--color-primary)"
                />
                <KPICard
                    title="Deneme Ortalaması"
                    value={stats.examAverage}
                    icon={TrendingUp}
                    color="#ec4899"
                />
                <KPICard
                    title="Çalışma Günü"
                    value={stats.streakDays}
                    icon={Calendar}
                    color="#f59e0b"
                />
                <KPICard
                    title="Başarı Oranı"
                    value={`%${stats.completionRate}`}
                    icon={CheckCircle}
                    color="#10b981"
                />
            </div>

            {/* Main Content Grid */}
            <div className="content-grid">
                {/* Chart Column */}
                <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '400px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Son 7 Gün İlerleme</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorQuestions" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                <XAxis dataKey="name" stroke="var(--text-muted)" axisLine={false} tickLine={false} />
                                <YAxis stroke="var(--text-muted)" axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-color)', borderRadius: '12px' }}
                                    itemStyle={{ color: 'white' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="questions"
                                    stroke="var(--color-primary)"
                                    fillOpacity={1}
                                    fill="url(#colorQuestions)"
                                    strokeWidth={3}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sidebar/Recent Column */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Son Aktiviteler</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {recentActivities.length > 0 ? recentActivities.map((item, idx) => (
                            <div key={idx} style={{ paddingBottom: '0.75rem', borderBottom: idx !== recentActivities.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{item.date}</div>
                                <div style={{ fontWeight: 500 }}>{item.title}</div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--color-primary)' }}>{item.score}</div>
                            </div>
                        )) : (
                            <p style={{ color: 'var(--text-muted)' }}>Henüz bir aktivite yok.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
