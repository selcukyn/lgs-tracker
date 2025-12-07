import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Award, Trophy, AlertCircle, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Exams = () => {
    const { examHistory, subjects, addExam, deleteExam, calculateLGS, userRole, selectedStudent } = useData();
    const navigate = useNavigate();
    const [showForm, setShowForm] = useState(false);

    // Best/Worst Calculation
    const maxScore = Math.max(...examHistory.map(e => e.totalScore));
    const minScore = Math.min(...examHistory.map(e => e.totalScore));

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
                    <p>Deneme sonuçlarını görmek veya eklemek için lütfen sol menüden bir öğrenci seçiniz.</p>
                </div>
            </div>
        );
    }

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        date: new Date().toISOString().split('T')[0],
        results: {}
    });

    // Initialize results for each subject
    useEffect(() => {
        if (subjects.length > 0 && Object.keys(formData.results).length === 0) {
            const initialResults = {};
            subjects.forEach(sub => {
                initialResults[sub.name] = { correct: 0, incorrect: 0, empty: 0 };
            });
            setFormData(prev => ({ ...prev, results: initialResults }));
        }
    }, [subjects]);

    const [previewScore, setPreviewScore] = useState({ score: 0, totalNet: 0 });

    // Update preview when numbers change
    useEffect(() => {
        // Need to calculate nets first to pass to calculateLGS
        const tempResults = {};
        Object.keys(formData.results).forEach(key => {
            const r = formData.results[key];
            tempResults[key] = { ...r, net: r.correct - (r.incorrect / 3) };
        });
        setPreviewScore(calculateLGS(tempResults));
    }, [formData.results]);

    const handleInputChange = (subject, field, value) => {
        const val = parseInt(value) || 0;
        setFormData(prev => ({
            ...prev,
            results: {
                ...prev.results,
                [subject]: {
                    ...prev.results[subject],
                    [field]: val
                }
            }
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validation: Check Max Questions
        for (const sub of subjects) {
            const r = formData.results[sub.name];
            const total = (r.correct || 0) + (r.incorrect || 0) + (r.empty || 0);

            if (total !== sub.maxQuestions) {
                alert(`${sub.name} dersi için toplam soru sayısı ${sub.maxQuestions} olmalıdır. (Şu an: ${total}). Lütfen boş bıraktığınız soruları da giriniz.`);
                return;
            }
        }

        addExam(formData);
        setShowForm(false);
        // Reset form
        const initialResults = {};
        subjects.forEach(sub => {
            initialResults[sub.name] = { correct: 0, incorrect: 0, empty: 0 };
        });
        setFormData({ name: '', date: new Date().toISOString().split('T')[0], results: initialResults });
    };

    // Custom confirm for react environment
    const handleDeleteConfirm = (e, id) => {
        e.stopPropagation();
        if (window.confirm('Bu denemeyi silmek istediğinize emin misiniz?')) {
            deleteExam(id);
        }
    };


    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Header & Add Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.875rem', fontWeight: '700' }}>Deneme Sınavları</h2>
                    <p style={{ color: 'var(--text-muted)' }}>LGS puan hesaplaması ve detaylı analiz.</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
                    <Plus size={20} style={{ marginRight: '0.5rem' }} />
                    Yeni Deneme Ekle
                </button>
            </div>

            {/* Entry Form */}
            {showForm && (
                <div className="glass-panel" style={{ padding: '2rem', animation: 'fadeIn 0.3s ease' }}>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Yayınevi / Deneme Adı</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Örn: Özdebir Yayınları Türkiye Geneli 1"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'white', border: '1px solid var(--border-color)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                    Sınav Tarihi
                                </label>
                                <input
                                    required
                                    type="date"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'white', border: '1px solid var(--border-color)' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {subjects.map(sub => (
                                <div key={sub.name} style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) 1fr 1fr 1fr 1fr', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                    <span style={{ fontWeight: 500, color: sub.color }}>{sub.name} <span style={{ fontSize: '0.75rem', opacity: 0.7, display: 'block' }}>(Max: {sub.maxQuestions})</span></span>
                                    <input type="number" min="0" placeholder="Doğru"
                                        value={formData.results[sub.name]?.correct || ''}
                                        onChange={e => handleInputChange(sub.name, 'correct', e.target.value)}
                                        style={{ padding: '0.5rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                                    />
                                    <input type="number" min="0" placeholder="Yanlış"
                                        value={formData.results[sub.name]?.incorrect || ''}
                                        onChange={e => handleInputChange(sub.name, 'incorrect', e.target.value)}
                                        style={{ padding: '0.5rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                                    />
                                    <input type="number" min="0" placeholder="Boş"
                                        value={formData.results[sub.name]?.empty || ''}
                                        onChange={e => handleInputChange(sub.name, 'empty', e.target.value)}
                                        style={{ padding: '0.5rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                                    />
                                    <span style={{ fontWeight: 'bold', textAlign: 'center' }}>
                                        {((formData.results[sub.name]?.correct || 0) - ((formData.results[sub.name]?.incorrect || 0) / 3)).toFixed(2)} Net
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Live Preview Footer */}
                        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h4 style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Tahmini LGS Puanı</h4>
                                <span style={{ fontSize: '2.5rem', fontWeight: '800', color: 'white' }}>{previewScore.score}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <h4 style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Toplam Net</h4>
                                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{previewScore.totalNet}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" onClick={() => setShowForm(false)} className="btn" style={{ border: '1px solid var(--border-color)' }}>İptal</button>
                                <button type="submit" className="btn btn-primary">Kaydet ve Ekle</button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Exam List */}
            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            <th style={{ padding: '1rem' }}>Deneme Adı</th>
                            <th style={{ padding: '1rem' }}>Tarih</th>
                            <th style={{ padding: '1rem' }}>Toplam Net</th>
                            <th style={{ padding: '1rem' }}>LGS Puanı</th>
                            <th style={{ padding: '1rem' }}>Durum</th>
                            <th style={{ padding: '1rem' }}>İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        {examHistory.map((exam) => (
                            <tr
                                key={exam.id}
                                onClick={() => navigate(`/exams/${exam.id}`)}
                                style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Award size={18} color="var(--color-primary)" />
                                    <span style={{ fontWeight: 500 }}>{exam.name}</span>
                                </td>
                                <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{exam.date}</td>
                                <td style={{ padding: '1rem', fontWeight: '500' }}>{exam.totalNet.toFixed(2)}</td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '99px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        fontWeight: '700',
                                        color: 'white'
                                    }}>
                                        {exam.totalScore.toFixed(3)}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    {exam.totalScore === maxScore && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#10b981', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                            <Trophy size={14} /> EN İYİ
                                        </div>
                                    )}
                                    {exam.totalScore === minScore && examHistory.length > 1 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#ef4444', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                            <AlertCircle size={14} /> EN DÜŞÜK
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <button
                                        onClick={(e) => handleDeleteConfirm(e, exam.id)}
                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.7 }}
                                        title="Sil"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
