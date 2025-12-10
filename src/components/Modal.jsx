import React from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, onConfirm, title, message, type = 'confirm', confirmText = 'Evet', cancelText = 'İptal' }) => {
    if (!isOpen) return null;

    const isConfirm = type === 'confirm';

    let Icon = Info;
    let iconColor = 'var(--primary)';
    let iconBg = 'rgba(59, 130, 246, 0.1)';

    if (type === 'danger' || type === 'confirm') {
        Icon = AlertTriangle;
        iconColor = '#ef4444';
        iconBg = 'rgba(239, 68, 68, 0.1)';
    } else if (type === 'success') {
        Icon = CheckCircle;
        iconColor = '#10b981';
        iconBg = 'rgba(16, 185, 129, 0.1)';
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '2rem',
                maxWidth: '400px',
                width: '90%',
                textAlign: 'center',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                position: 'relative'
            }}>
                {/* Close button for non-confirm types or optional usage */}
                {!isConfirm && (
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer'
                        }}
                    >
                        <X size={20} />
                    </button>
                )}

                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: iconBg,
                    color: iconColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem auto'
                }}>
                    <Icon size={24} />
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.75rem' }}>{title}</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.5' }}>
                    {message}
                </p>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    {isConfirm && (
                        <button
                            onClick={onClose}
                            className="btn"
                            style={{
                                flex: 1,
                                background: 'var(--surface)',
                                color: 'white',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (onConfirm) onConfirm();
                            onClose();
                        }}
                        className="btn"
                        style={{
                            flex: 1,
                            background: type === 'danger' || type === 'confirm' ? '#ef4444' : 'var(--primary)',
                            color: 'white',
                            border: 'none'
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
