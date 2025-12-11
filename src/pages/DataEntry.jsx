import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Save, Calendar, Trash2, Edit2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/Modal';

export const DataEntry = () => {
    const { dailyLogs, subjects, addDailyLog, deleteDailyLog, updateDailyLog, loading, userRole, selectedStudent } = useData();
    const navigate = useNavigate();
    const [editingId, setEditingId] = useState(null);
    const [modal, setModal] = useState({ isOpen: false, type: 'success', title: '', message: '', onConfirm: null });
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        subject: '',
        topic: '',
        count: '',
        correct: '',
        publisher: ''
    });

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

    const handleSubmit = async (e) => {
        e.preventDefault();

        let success = false;
        if (editingId) {
            await updateDailyLog(editingId, formData);
            setModal({
                isOpen: true,
                type: 'success',
                title: 'Başarılı',
                message: 'Kayıt başarıyla güncellendi.',
                confirmText: 'Tamam'
            });
            setEditingId(null);
        } else {
            await addDailyLog(formData);
            setModal({
                isOpen: true,
                type: 'success',
                title: 'Başarılı',
                message: 'Çözüm başarıyla kaydedildi!',
                confirmText: 'Tamam'
            });
        }

        setFormData({
            date: new Date().toISOString().split('T')[0],
            subject: '',
            topic: '',
            count: '',
            correct: '',
            publisher: ''
        });
    };

    const handleEdit = (log) => {
        setEditingId(log.id);
        setFormData({
            date: log.date,
            subject: log.subject,
            topic: log.topic,
            count: log.count,
            correct: log.correct,
            publisher: log.publisher || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = (id) => {
        setModal({
            isOpen: true,
            type: 'confirm',
            title: 'Silme Onayı',
            message: 'Bu çözümü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
            confirmText: 'Sil',
            cancelText: 'İptal',
            onConfirm: async () => {
                await deleteDailyLog(id);
                setModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setFormData({
            date: new Date().toISOString().split('T')[0],
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>

            {/* Input Form Section */}
            <div style={{ maxWidth: '600px', width: '100%', margin: '0 auto' }}>
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
                            className="input-field"
                        />
                    </div>

                    {/* Subject Select */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>Ders Seçimi</label>
                        <select
                            required
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            className="input-field"
                        >
                            <option value="">Ders Seçiniz</option>
                            {subjects.map(sub => (
                                <option key={sub.name} value={sub.name}>{sub.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Publisher & Topic Grid */}
                    <div className="form-grid">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>Yayınevi</label>
                            <input
                                type="text"
                                placeholder="Örn: Hız Yayınları"
                                value={formData.publisher}
                                onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                                className="input-field"
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>Konu</label>
                            <input
                                type="text"
                                placeholder="Örn: Kareköklü Sayılar"
                                value={formData.topic}
                                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                                className="input-field"
                            />
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="form-grid">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>Soru Sayısı</label>
                            <input
                                required
                                type="number"
                                min="1"
                                value={formData.count}
                                onChange={(e) => setFormData({ ...formData, count: e.target.value })}
                                className="input-field"
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
                                className="input-field"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', flex: 1 }}>
                            <Save size={20} style={{ marginRight: '0.5rem' }} />
                            {editingId ? 'Güncelle' : 'Kaydet'}
                        </button>
                        {editingId && (
                            <button
                                type="button"
                                onClick={cancelEdit}
                                className="btn"
                                style={{ marginTop: '1rem', background: 'var(--surface)', border: '1px solid var(--border-color)', color: 'white' }}
                            >
                                <X size={20} style={{ marginRight: '0.5rem' }} />
                                İptal
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Current Data List (Editable) */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={20} /> Son Çözülenler
                </h3>
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '1rem' }}>Tarih</th>
                                <th style={{ padding: '1rem' }}>Ders</th>
                                <th style={{ padding: '1rem' }}>Konu</th>
                                <th style={{ padding: '1rem' }}>Yayınevi</th>
                                <th style={{ padding: '1rem' }}>Soru/Doğru</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...dailyLogs].sort((a, b) => new Date(b.date) - new Date(a.date)).map((log) => (
                                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '1rem' }}>{log.date}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            color: subjects.find(s => s.name === log.subject)?.color || 'white',
                                            fontWeight: '500'
                                        }}>
                                            {log.subject}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem' }}>{log.topic || '-'}</td>
                                    <td style={{ padding: '1rem' }}>{log.publisher || '-'}</td>
                                    <td style={{ padding: '1rem' }}>
                                        {log.count} / <span style={{ color: '#4ade80' }}>{log.correct}</span>
                                    </td>
                                    <td style={{ padding: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => handleEdit(log)}
                                            style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                            title="Düzenle"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(log.id)}
                                            style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                            title="Sil"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {dailyLogs.length === 0 && (
                                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Henüz veri bulunmuyor.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Matrix History View (Summary) */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={20} /> Özet Tablo (Matris)
                </h3>
                <div className="table-container">
                    <table className="data-table" style={{ textAlign: 'center' }}>
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

            {/* Modal */}
            <Modal
                isOpen={modal.isOpen}
                onClose={() => setModal({ ...modal, isOpen: false })}
                onConfirm={modal.onConfirm}
                title={modal.title}
                message={modal.message}
                type={modal.type}
                confirmText={modal.confirmText}
                cancelText={modal.cancelText}
            />
        </div >
    );
};
