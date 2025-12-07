import React from 'react';

export const KPICard = ({ title, value, icon: Icon, trend, color, subtext }) => {
    return (
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{title}</p>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-main)' }}>{value}</h3>
                </div>
                <div style={{
                    padding: '0.75rem',
                    borderRadius: '12px',
                    backgroundColor: `${color}20`,
                    color: color
                }}>
                    <Icon size={24} />
                </div>
            </div>

            {trend && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <span style={{ color: trend > 0 ? '#10b981' : '#ef4444', fontWeight: '500' }}>
                        {trend > 0 ? '+' : ''}{trend}%
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>{subtext}</span>
                </div>
            )}
        </div>
    );
};
