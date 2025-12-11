import React from 'react';
import { useData } from '../context/DataContext';
import { Medal, Star, Target, Zap, Book, Crown, Award } from 'lucide-react';

export const Achievements = () => {
    const { dailyLogs, examHistory, subjects } = useData();

    // Calculate Badges
    const badges = [
        {
            id: 'first_step',
            title: 'İlk Adım',
            description: 'İlk soru çözümünü kaydettin.',
            icon: Target,
            color: '#3b82f6', // Blue
            isUnlocked: dailyLogs.length > 0,
            progress: dailyLogs.length > 0 ? 100 : 0
        },
        {
            id: 'on_fire',
            title: 'Isınıyoruz',
            description: 'Toplam 100 soru barajını geçtin.',
            icon: Zap,
            color: '#f97316', // Orange
            isUnlocked: false,
            target: 100,
            current: 0
        },
        {
            id: 'master_solver',
            title: 'Soru Canavarı',
            description: 'Toplam 1000 soru çözdün!',
            icon: Star,
            color: '#eab308', // Yellow
            isUnlocked: false,
            target: 1000,
            current: 0
        },
        {
            id: 'math_wizard',
            title: 'Matematik Kurdu',
            description: 'Matematik dersinden 500 soru çözdün.',
            icon: Book,
            color: '#ef4444', // Red
            isUnlocked: false,
            target: 500,
            current: 0
        },
        {
            id: 'exam_veteran',
            title: 'Deneme Gazisi',
            description: '5 adet deneme sınavı tamamladın.',
            icon: Crown,
            color: '#8b5cf6', // Violet
            isUnlocked: false,
            target: 5,
            current: 0
        }
    ];

    // Calculate Progress for badges
    const totalQuestions = dailyLogs.reduce((acc, curr) => acc + (parseInt(curr.count) || 0), 0);
    const mathQuestions = dailyLogs
        .filter(l => l.subject === 'Matematik')
        .reduce((acc, curr) => acc + (parseInt(curr.count) || 0), 0);
    const totalExams = examHistory.length;

    // Update Badge States
    // On Fire
    badges[1].current = totalQuestions;
    badges[1].isUnlocked = totalQuestions >= badges[1].target;
    badges[1].progress = Math.min(100, Math.round((totalQuestions / badges[1].target) * 100));

    // Master Solver
    badges[2].current = totalQuestions;
    badges[2].isUnlocked = totalQuestions >= badges[2].target;
    badges[2].progress = Math.min(100, Math.round((totalQuestions / badges[2].target) * 100));

    // Math Wizard
    badges[3].current = mathQuestions;
    badges[3].isUnlocked = mathQuestions >= badges[3].target;
    badges[3].progress = Math.min(100, Math.round((mathQuestions / badges[3].target) * 100));

    // Exam Veteran
    badges[4].current = totalExams;
    badges[4].isUnlocked = totalExams >= badges[4].target;
    badges[4].progress = Math.min(100, Math.round((totalExams / badges[4].target) * 100));


    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Award size={24} color="#eab308" />
                Başarımlar & Rozetler
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                {badges.map(badge => (
                    <div
                        key={badge.id}
                        style={{
                            background: badge.isUnlocked ? `linear-gradient(145deg, ${badge.color}20, rgba(255,255,255,0.05))` : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${badge.isUnlocked ? badge.color : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: '12px',
                            padding: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            gap: '0.75rem',
                            opacity: badge.isUnlocked ? 1 : 0.5,
                            filter: badge.isUnlocked ? 'none' : 'grayscale(100%)',
                            transition: 'all 0.3s'
                        }}
                        title={badge.description}
                    >
                        <div style={{
                            padding: '0.75rem',
                            borderRadius: '50%',
                            background: badge.isUnlocked ? badge.color : 'rgba(255,255,255,0.1)',
                            color: 'white',
                            boxShadow: badge.isUnlocked ? `0 0 15px ${badge.color}60` : 'none'
                        }}>
                            <badge.icon size={24} />
                        </div>

                        <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{badge.title}</div>
                            {!badge.isUnlocked && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    {badge.current} / {badge.target}
                                </div>
                            )}
                        </div>

                        {/* Mini Progress Bar for locked items */}
                        {!badge.isUnlocked && badge.progress > 0 && (
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: 'auto' }}>
                                <div style={{ width: `${badge.progress}%`, height: '100%', background: badge.color, borderRadius: '2px' }} />
                            </div>
                        )}

                        {badge.isUnlocked && (
                            <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 'bold', marginTop: 'auto' }}>
                                KAZANILDI
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
