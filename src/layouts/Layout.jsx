import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { Outlet } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { UserCircle, Menu, X } from 'lucide-react';

export const Layout = () => {
    const { userProfile, user } = useData();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

    React.useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth >= 768) {
                setIsSidebarOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* Mobile Header */}
            {isMobile && (
                <div style={{
                    padding: '1rem',
                    background: 'var(--bg-card)',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'sticky',
                    top: 0,
                    zIndex: 90
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                        >
                            <Menu size={24} />
                        </button>
                        <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>LGS Takip</span>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flex: 1 }}>
                <Sidebar
                    isMobile={isMobile}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />

                <main style={{
                    flex: 1,
                    marginLeft: isMobile ? 0 : '250px',
                    padding: isMobile ? '1rem' : '2rem',
                    width: '100%',
                    overflowX: 'hidden' // Prevent horizontal scroll
                }}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
