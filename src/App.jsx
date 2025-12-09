import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './layouts/Layout';
import { DataProvider, useData } from './context/DataContext';
import { Dashboard } from './pages/Dashboard';
import { DataEntry } from './pages/DataEntry';
import { Exams } from './pages/Exams';
import { ExamDetail } from './pages/ExamDetail';
import { Login } from './pages/Login';
import { AdminUsers } from './pages/AdminUsers'; // Import

// Wrapper to use context inside Router
const AppRoutes = () => {
  // We need to access context, but context is provided by DataProvider which is parent of Browser Router in main App?
  // Actually the hierarchy is DataProvider -> BrowserRouter -> Routes. 
  // Wait, useData needs to be inside DataProvider.

  // Changing structure slightly:
  // App -> DataProvider -> BrowserRouter -> InnerApp

  return (
    <BrowserRouter>
      <AuthGuard />
    </BrowserRouter>
  )
}

const AuthGuard = () => {
  const { user, loading } = useData();

  if (loading) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Yükleniyor...</div>;

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />

      {/* Protected Routes */}
      <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
        <Route index element={<Dashboard />} />
        <Route path="entry" element={<DataEntry />} />
        <Route path="exams" element={<Exams />} />
        <Route path="exams/:id" element={<ExamDetail />} />
        <Route path="admin-users" element={<AdminUsers />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <DataProvider>
      <RoutesWrapper />
    </DataProvider>
  );
}

// Separate component to handle Router nesting if needed, or just put BrowserRouter inside DataProvider
const RoutesWrapper = () => (
  <BrowserRouter>
    <AuthGuard />
  </BrowserRouter>
);


export default App;
