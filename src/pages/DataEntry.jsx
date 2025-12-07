import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Save, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DataEntry = () => {
    const { dailyLogs, subjects, addDailyLog, loading, userRole, selectedStudent } = useData();
    const navigate = useNavigate();

    // Guard: Require Student Selection for Admin/Teacher
    if (['admin', 'teacher'].includes(userRole) && !selectedStudent) {
        return (
            <div style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                gap: '1rem'
            }}>
                <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', textAlign: 'center' }}>
                    <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>Öğrenci Seçilmedi</h3>
                    <p>Veri girişi yapmak veya görüntülemek için lütfen sol menüden bir öğrenci seçiniz.</p>
                </div>
            </div>
        );
    }
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        subject: '',
        topic: '',
        count: '',
        correct: '',
        publisher: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        addDailyLog(formData);
        alert('Çözüm kaydedildi!');
        setFormData({
            ...formData,
            subject: '',
            topic: '',
            count: '',
            correct: '',
            publisher: ''
        });
    };

    // Process logs for Matrix View
    // We want rows as Dates, Columns as Subjects. Value = Total questions for that day/subject.
    const dates = [...new Set(dailyLogs.map(log => log.date))].sort((a, b) => new Date(b) - new Date(a));

    const matrixData = dates.map(date => {
        const row = { date };
        subjects.forEach(sub => {
            const total = dailyLogs
                .filter(log => log.date === date && log.subject === sub.name)
                .reduce((acc, curr) => acc + parseInt(curr.count || 0), 0);
            row[sub.name] = total;
        });
        return row;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Input Form Section */}
            <div style={{ maxWidth: '600px' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.875rem', fontWeight: '700' }}>Çözüm Girişi</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Günlük çözdüğün soruları kaydet.</p>
                </div>

                <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Date Selection */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>Tarih</label>
                        <input
                            required
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'white', border: '1px solid var(--border-color)', outline: 'none' }}
                        />
                    </div>

                    {/* Subject Select */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>Ders Seçimi</label>
                        <select
                            required
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            style={{
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-app)',
                                color: 'white',
                                border: '1px solid var(--border-color)',
                                outline: 'none'
                            }}
                        >
                            <option value="">Ders Seçiniz</option>
                            {subjects.map(sub => (
                                <option key={sub.name} value={sub.name}>{sub.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Publisher & Topic Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>Yayınevi</label>
                            <input
                                type="text"
                                placeholder="Örn: Hız Yayınları"
                                value={formData.publisher}
                                onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                                style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'white', border: '1px solid var(--border-color)', outline: 'none' }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>Konu</label>
                            <input
                                type="text"
                                placeholder="Örn: Kareköklü Sayılar"
                                value={formData.topic}
                                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                                style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'white', border: '1px solid var(--border-color)', outline: 'none' }}
                            />
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>Soru Sayısı</label>
                            <input
                                required
                                type="number"
                                min="1"
                                value={formData.count}
                                onChange={(e) => setFormData({ ...formData, count: e.target.value })}
                                style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'white', border: '1px solid var(--border-color)', outline: 'none' }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>Doğru Sayısı</label>
                            <input
                                type="number"
                                min="0"
                                max={formData.count}
                                value={formData.correct}
                                onChange={(e) => setFormData({ ...formData, correct: e.target.value })}
                                style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'white', border: '1px solid var(--border-color)', outline: 'none' }}
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        <Save size={20} style={{ marginRight: '0.5rem' }} />
                        Kaydet
                    </button>
                </form>
            </div>

            {/* Matrix History View */}
            <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={20} /> Çözüm Geçmişi (Matris)
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.875rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Tarih</th>
                            {subjects.map(sub => (
                                <th key={sub.name} style={{ padding: '1rem', color: sub.color }}>{sub.name}</th>
                            ))}
                            <th style={{ padding: '1rem', fontWeight: 'bold' }}>Toplam</th>
                        </tr>
                    </thead>
                    <tbody>
                        {matrixData.map((row, idx) => {
                            const rowTotal = subjects.reduce((acc, sub) => acc + (row[sub.name] || 0), 0);
                            return (
                                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '1rem', textAlign: 'left', fontWeight: '500' }}>{row.date}</td>
                                    {subjects.map(sub => (
                                        <td key={sub.name} style={{ padding: '1rem' }}>
                                            {row[sub.name] > 0 ? (
                                                <span style={{
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '6px',
                                                    backgroundColor: `${sub.color} 20`,
                                                    color: sub.color,
                                                    fontWeight: '600'
                                                }}>
                                                    {row[sub.name]}
                                                </span>
                                            ) : '-'}
                                        </td>
                                    ))}
                                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{rowTotal}</td>
                                </tr>
                            );
                        })}
                        {matrixData.length === 0 && (
                            <tr><td colSpan={subjects.length + 2} style={{ padding: '2rem', color: 'var(--text-muted)' }}>Henüz veri girişi yapılmamış.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
};
