import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { Outlet } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { UserCircle } from 'lucide-react';

export const Layout = () => {
    const { userProfile, session } = useData();

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <main style={{
                flex: 1,
                marginLeft: '250px',
                padding: '2rem',
                minHeight: '100vh',
            }}>
                <Outlet />
            </main>
        </div>
    );
};
