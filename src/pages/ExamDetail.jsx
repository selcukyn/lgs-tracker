import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { ArrowLeft, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const ExamDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { examHistory, subjects } = useData();

    const examIndex = examHistory.findIndex(e => e.id.toString() === id);
    const exam = examHistory[examIndex];
    const previousExam = examHistory[examIndex + 1]; // History is sorted New -> Old

    if (!exam) return <div style={{ padding: '2rem' }}>Sınav bulunamadı.</div>;

    // Prepare Chart Data
    const chartData = subjects.map(sub => ({
        name: sub.name,
        net: exam.results[sub.name]?.net || 0,
        prevNet: previousExam ? (previousExam.results[sub.name]?.net || 0) : 0
    }));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <button onClick={() => navigate('/exams')} className="btn" style={{ alignSelf: 'flex-start', paddingLeft: 0, gap: '0.5rem', color: 'var(--text-muted)' }}>
                <ArrowLeft size={20} /> Listeye Dön
            </button>

            {/* Header Info */}
            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>{exam.name}</h1>
                    <p style={{ color: 'var(--text-muted)' }}>{exam.date}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>LGS PUANI</div>
                    <div style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--color-primary)', lineHeight: 1 }}>
                        {exam.totalScore.toFixed(3)}
                    </div>
                    {previousExam && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem', marginTop: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                            {exam.totalScore > previousExam.totalScore ? (
                                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center' }}><ArrowUp size={14} /> +{(exam.totalScore - previousExam.totalScore).toFixed(2)}</span>
                            ) : (
                                <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center' }}><ArrowDown size={14} /> {(exam.totalScore - previousExam.totalScore).toFixed(2)}</span>
                            )}
                            <span style={{ color: 'var(--text-muted)' }}>önceki sınavdan</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Subject Breakdown Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {subjects.map(sub => {
                    const result = exam.results[sub.name] || { correct: 0, incorrect: 0, empty: 0, net: 0 };
                    const prevResult = previousExam ? previousExam.results[sub.name] : null;
                    const netDiff = prevResult ? result.net - prevResult.net : 0;

                    return (
                        <div key={sub.name} className="glass-panel" style={{ padding: '1.5rem', borderTop: `4px solid ${sub.color}` }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>{sub.name}</h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ color: '#10b981' }}>Doğru: <b>{result.correct}</b></span>
                                <span style={{ color: '#ef4444' }}>Yanlış: <b>{result.incorrect}</b></span>
                                <span style={{ color: 'var(--text-muted)' }}>Boş: <b>{result.empty}</b></span>
                            </div>
                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{result.net.toFixed(2)} <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>Net</span></span>

                                {prevResult && netDiff !== 0 && (
                                    <span style={{
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        backgroundColor: netDiff > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        color: netDiff > 0 ? '#10b981' : '#ef4444'
                                    }}>
                                        {netDiff > 0 ? '+' : ''}{netDiff.toFixed(2)}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Comparative Chart */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Net Karşılaştırması</h3>
                <div style={{ height: '300px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                            <XAxis dataKey="name" stroke="var(--text-muted)" axisLine={false} tickLine={false} />
                            <YAxis stroke="var(--text-muted)" axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-color)', borderRadius: '12px', color: 'white' }}
                                itemStyle={{ color: 'white' }}
                                labelStyle={{ color: 'var(--text-muted)' }}
                            />
                            <Bar dataKey="prevNet" name="Önceki Sınav" fill="var(--text-muted)" fillOpacity={0.3} radius={[4, 4, 0, 0]} />
                            <Bar dataKey="net" name="Bu Sınav" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </div>
    );
};
