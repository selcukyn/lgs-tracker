import React from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { LayoutDashboard, PenTool, BookOpen, LogOut, Users, ChevronDown, User } from 'lucide-react';
import { useData } from '../context/DataContext';

export const Sidebar = () => {
    const navigate = useNavigate();
    const { userRole, userProfile, studentList, selectedStudent, setSelectedStudent, logout, loading } = useData();

    // Navigation items - admin gets extra menu
    const navItems = [
        { icon: LayoutDashboard, label: 'Panel', path: '/' },
        { icon: PenTool, label: 'Çözüm Girişi', path: '/entry' },
        { icon: BookOpen, label: 'Deneme Sonuçları', path: '/exams' },
        ...(userRole === 'admin' ? [{ icon: Users, label: 'Kullanıcı Yönetimi', path: '/admin-users' }] : [])
    ];

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const getRoleLabel = (role) => {
        switch (role) {
            case 'admin': return 'Yönetici';
            case 'teacher': return 'Öğretmen';
            default: return 'Öğrenci';
        }
    };

    return (
        <aside style={{
            width: '250px',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            backgroundColor: 'var(--bg-sidebar)',
            borderRight: '1px solid var(--border-color)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            zIndex: 100
        }}>
            <div>
                {/* Logo */}
                <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', background: 'var(--color-primary)', borderRadius: '8px' }}></div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'white' }}>LGS Takip</h1>
                </div>

                {/* Student Selector for Admin/Teacher */}
                {['admin', 'teacher'].includes(userRole) && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>
                            ÖĞRENCİ SEÇİMİ
                        </label>
                        <div style={{ position: 'relative' }}>
                            <select
                                value={selectedStudent || ''}
                                onChange={(e) => setSelectedStudent(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--border-color)',
                                    color: 'white',
                                    appearance: 'none',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="" disabled>Öğrenci Seçiniz</option>
                                {studentList.map(s => (
                                    <option key={s.id} value={s.id} style={{ color: 'black' }}>
                                        {s.full_name || s.email || 'İsimsiz Öğrenci'}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            style={({ isActive }) => ({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                color: isActive ? 'white' : 'var(--text-muted)',
                                backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                                transition: 'all 0.2s ease',
                                textDecoration: 'none'
                            })}
                        >
                            <item.icon size={20} />
                            <span style={{ fontWeight: 500 }}>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>
            </div>

            <div style={{ marginTop: 'auto' }}>
                {/* User Info */}
                <div style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                    }}>
                        <User size={18} />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {userProfile?.full_name || 'Kullanıcı'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {getRoleLabel(userRole)}
                        </div>
                    </div>
                </div>

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    disabled={loading}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '8px',
                        color: '#ef4444',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        width: '100%',
                        transition: 'all 0.2s',
                        opacity: loading ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)')}
                >
                    <LogOut size={20} />
                    <span>Çıkış Yap</span>
                </button>
            </div>
        </aside>
    );
};
