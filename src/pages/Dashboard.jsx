import React from 'react';
import { useData } from '../context/DataContext';
import { KPICard } from '../components/KPICard';

import { Target, TrendingUp, Calendar, CheckCircle, Edit2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import confetti from 'canvas-confetti';
import { Achievements } from '../components/Achievements';

export const Dashboard = () => {
    const { stats, dailyLogs, examHistory } = useData();
    const [weeklyGoal, setWeeklyGoal] = React.useState(() => {
        return parseInt(localStorage.getItem('user_weekly_goal') || '500');
    });
    const [isEditingGoal, setIsEditingGoal] = React.useState(false);

    // Calculate this week's progress
    const thisWeekTotal = React.useMemo(() => {
        if (!dailyLogs || dailyLogs.length === 0) return 0;

        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)));
        startOfWeek.setHours(0, 0, 0, 0);

        return dailyLogs
            .filter(log => new Date(log.date) >= startOfWeek)
            .reduce((acc, curr) => acc + (parseInt(curr.count) || 0), 0);
    }, [dailyLogs]);

    const progressPercentage = Math.min(100, Math.round((thisWeekTotal / weeklyGoal) * 100));

    // Confetti effect when goal reached
    React.useEffect(() => {
        if (progressPercentage >= 100 && thisWeekTotal > 0) {
            // Check if already celebrated today to avoid spam
            const lastCelebration = localStorage.getItem('last_celebration_date');
            const today = new Date().toISOString().split('T')[0];

            if (lastCelebration !== today) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 }
                });
                localStorage.setItem('last_celebration_date', today);
            }
        }
    }, [progressPercentage, thisWeekTotal]);

    const handleGoalUpdate = (e) => {
        e.preventDefault();
        const newGoal = parseInt(e.target.goal.value);
        if (newGoal > 0) {
            setWeeklyGoal(newGoal);
            localStorage.setItem('user_weekly_goal', newGoal.toString());
            setIsEditingGoal(false);
        }
    };

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

            {/* Weekly Goal Progress */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Bu Haftaki Hedef</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            {thisWeekTotal} / {weeklyGoal} Soru
                        </p>
                    </div>
                    <button
                        onClick={() => setIsEditingGoal(!isEditingGoal)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                        <Edit2 size={18} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div style={{ height: '12px', width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{
                        height: '100%',
                        width: `${progressPercentage}%`,
                        background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))',
                        borderRadius: '6px',
                        transition: 'width 1s ease-in-out',
                        boxShadow: '0 0 10px rgba(99, 102, 241, 0.5)'
                    }} />
                </div>

                {progressPercentage >= 100 && (
                    <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckCircle size={16} /> Harika! Haftalık hedefini tamamladın! 🎉
                    </div>
                )}

                {/* Edit Goal Form */}
                {isEditingGoal && (
                    <form onSubmit={handleGoalUpdate} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <input
                            name="goal"
                            type="number"
                            defaultValue={weeklyGoal}
                            min="10"
                            className="input-field"
                            style={{ padding: '0.5rem' }}
                            autoFocus
                        />
                        <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Kaydet</button>
                    </form>
                )}
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

                {/* Achievements */}
                <Achievements />
            </div>
        </div>
    );
};
