import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useData } from '../context/DataContext';
import { Trash2, Edit2, Search, UserPlus, RefreshCw } from 'lucide-react';
import { Modal } from '../components/Modal';

export const AdminUsers = () => {
    const { userRole, loading: contextLoading, refreshApp } = useData();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({ full_name: '', role: 'student', class_group: '' });

    // Add User Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', role: 'student' });
    const [modal, setModal] = useState({ isOpen: false, type: 'info', title: '', message: '', onConfirm: null });

    // Fetch users
    const fetchUsers = async () => {
        console.log('[AdminUsers] Fetching users...');
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('role', { ascending: true });

            if (error) {
                console.error('[AdminUsers] Error:', error);
                setModal({ isOpen: true, type: 'danger', title: 'Hata', message: 'Kullanıcı listesi çekilemedi: ' + error.message, confirmText: 'Tamam' });
            } else {
                console.log('[AdminUsers] Loaded', data?.length, 'users');
                setUsers(data || []);
            }
        } catch (err) {
            console.error('[AdminUsers] Unexpected error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Load users when component mounts and user is admin
    useEffect(() => {
        if (userRole === 'admin' && !contextLoading) {
            fetchUsers();
        }
    }, [userRole, contextLoading]);

    // Guard: Wait for context to load
    if (contextLoading) {
        return (
            <div style={{ padding: '2rem', color: 'white', textAlign: 'center' }}>
                <p>Yükleniyor...</p>
            </div>
        );
    }

    // Guard: Check admin role
    if (userRole !== 'admin') {
        return (
            <div style={{ padding: '2rem', color: 'white' }}>
                Bu sayfaya erişim yetkiniz yok.
            </div>
        );
    }

    // Add new user
    const handleAddUser = async (e) => {
        e.preventDefault();

        if (!newUser.full_name?.trim()) {
            setModal({ isOpen: true, type: 'danger', title: 'Eksik Bilgi', message: 'Lütfen Ad Soyad giriniz.', confirmText: 'Tamam' });
            return;
        }

        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            const redirectTo = `${window.location.origin}/login`;

            const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                },
                body: JSON.stringify({
                    email: newUser.email,
                    password: newUser.password,
                    data: {
                        full_name: newUser.full_name,
                        role: newUser.role
                    },
                    options: {
                        emailRedirectTo: redirectTo
                    }
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.msg || data.message || 'Kullanıcı oluşturulamadı');
            }

            const createdUserId = data?.user?.id;

            if (createdUserId) {
                await supabase.from('profiles').upsert({
                    id: createdUserId,
                    email: newUser.email,
                    full_name: newUser.full_name,
                    role: newUser.role
                });
            }

            setModal({ isOpen: true, type: 'success', title: 'Başarılı', message: 'Kullanıcı başarıyla oluşturuldu!', confirmText: 'Tamam' });
            setShowAddModal(false);
            setNewUser({ email: '', password: '', full_name: '', role: 'student' });
            fetchUsers();
        } catch (error) {
            setModal({ isOpen: true, type: 'danger', title: 'Hata', message: 'Hata: ' + error.message, confirmText: 'Tamam' });
        }
    };

    // Edit user
    const handleEditClick = (user) => {
        setEditingUser(user.id);
        setFormData({
            full_name: user.full_name || '',
            role: user.role || 'student',
            class_group: user.class_group || ''
        });
    };

    const handleCancelEdit = () => {
        setEditingUser(null);
        setFormData({ full_name: '', role: 'student', class_group: '' });
    };

    const handleSave = async (id) => {
        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: formData.full_name,
                role: formData.role,
                class_group: formData.class_group
            })
            .eq('id', id);

        if (error) {
            setModal({ isOpen: true, type: 'danger', title: 'Hata', message: 'Güncelleme başarısız: ' + error.message, confirmText: 'Tamam' });
        } else {
            setUsers(prev => prev.map(u => u.id === id ? { ...u, ...formData } : u));
            setEditingUser(null);
            refreshApp();
        }
    };

    // Delete user
    const handleDelete = async (id) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (id === user?.id) {
            setModal({ isOpen: true, type: 'danger', title: 'Hata', message: 'Kendinizi silemezsiniz!', confirmText: 'Tamam' });
            return;
        }

        setModal({
            isOpen: true,
            type: 'confirm',
            title: 'Kullanıcı Silme',
            message: 'Bu kullanıcıyı silmek istediğinize emin misiniz?',
            confirmText: 'Sil',
            cancelText: 'İptal',
            onConfirm: async () => {
                const { error } = await supabase.from('profiles').delete().eq('id', id);

                if (error) {
                    setModal({ isOpen: true, type: 'danger', title: 'Hata', message: 'Silme başarısız: ' + error.message, confirmText: 'Tamam' });
                } else {
                    setUsers(prev => prev.filter(u => u.id !== id));
                    setModal(prev => ({ ...prev, isOpen: false })); // Close confirm modal first
                    // Optionally show success, but standard is just removing it. 
                    // Let's show a quick success or just let it vanish. The user asked for popups.
                    setTimeout(() => {
                        setModal({ isOpen: true, type: 'success', title: 'Başarılı', message: 'Kullanıcı silindi.', confirmText: 'Tamam' });
                    }, 100);
                }
            }
        });
    };

    const filteredUsers = users.filter(u =>
        (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.role || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header */}
            <div>
                <h2 style={{ fontSize: '1.875rem', fontWeight: '700' }}>Kullanıcı Yönetimi</h2>
                <p style={{ color: 'var(--text-muted)' }}>Öğrenci ve öğretmenleri buradan yönetebilirsiniz.</p>
            </div>

            {/* Actions Bar */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="İsim veya rol ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white' }}
                    />
                </div>
                <button
                    onClick={fetchUsers}
                    className="btn"
                    disabled={loading}
                    style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)' }}
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn btn-primary"
                    style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <UserPlus size={20} />
                    <span style={{ whiteSpace: 'nowrap' }}>Kullanıcı Ekle</span>
                </button>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, backdropFilter: 'blur(5px)'
                }}>
                    <div className="glass-panel" style={{ width: '400px', padding: '2rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Yeni Kullanıcı Ekle</h3>
                        <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.4rem' }}>E-Posta</label>
                                <input
                                    required type="email"
                                    value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.4rem' }}>Şifre</label>
                                <input
                                    required type="password"
                                    value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.4rem' }}>Ad Soyad</label>
                                <input
                                    required type="text"
                                    value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.4rem' }}>Rol</label>
                                <select
                                    value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }}
                                >
                                    <option value="student">Öğrenci</option>
                                    <option value="teacher">Öğretmen</option>
                                    <option value="admin">Yönetici</option>
                                </select>
                            </div>

                            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setShowAddModal(false)} className="btn" style={{ background: 'transparent', border: '1px solid var(--border-color)' }}>İptal</button>
                                <button type="submit" className="btn btn-primary">Oluştur</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Users Table */}
            <div className="glass-panel" style={{ padding: '1rem' }}>
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Yükleniyor...
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Kullanıcı bulunamadı.
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                    <th style={{ padding: '1rem' }}>E-Posta</th>
                                    <th style={{ padding: '1rem' }}>Ad Soyad</th>
                                    <th style={{ padding: '1rem' }}>Rol</th>
                                    <th style={{ padding: '1rem' }}>Sınıf</th>
                                    <th style={{ padding: '1rem' }}>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(user => (
                                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                                            {user.email || '-'}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {editingUser === user.id ? (
                                                <input
                                                    value={formData.full_name}
                                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', padding: '0.25rem' }}
                                                />
                                            ) : (
                                                <div style={{ fontWeight: 500 }}>{user.full_name || 'İsimsiz'}</div>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {editingUser === user.id ? (
                                                <select
                                                    value={formData.role}
                                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', padding: '0.25rem' }}
                                                >
                                                    <option value="student">Öğrenci</option>
                                                    <option value="teacher">Öğretmen</option>
                                                    <option value="admin">Yönetici</option>
                                                </select>
                                            ) : (
                                                <span style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '99px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 'bold',
                                                    backgroundColor: user.role === 'admin' ? 'rgba(239, 68, 68, 0.2)' : user.role === 'teacher' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                                    color: user.role === 'admin' ? '#fca5a5' : user.role === 'teacher' ? '#fcd34d' : '#93c5fd'
                                                }}>
                                                    {user.role === 'student' ? 'Öğrenci' : user.role === 'teacher' ? 'Öğretmen' : 'Yönetici'}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {editingUser === user.id ? (
                                                <input
                                                    value={formData.class_group}
                                                    onChange={e => setFormData({ ...formData, class_group: e.target.value })}
                                                    placeholder="Örn: 8-A"
                                                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', padding: '0.25rem', width: '80px' }}
                                                />
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>{user.class_group || '-'}</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                                            {editingUser === user.id ? (
                                                <>
                                                    <button onClick={() => handleSave(user.id)} style={{ padding: '0.25rem 0.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Kaydet</button>
                                                    <button onClick={handleCancelEdit} style={{ padding: '0.25rem 0.5rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}>İptal</button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => handleEditClick(user)} style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', cursor: 'pointer' }} title="Düzenle">
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button onClick={() => handleDelete(user.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Sil">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
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
        </div>
    );
};
