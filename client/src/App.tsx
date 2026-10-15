import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { AuthorPortal } from './pages/author/AuthorPortal';
import { AdminPortal } from './pages/admin/AdminPortal';

const MainApp: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          color: 'var(--text-muted)'
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(99, 102, 241, 0.2)',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: '0.9rem' }}>Loading BookLeaf Support Portal...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app-container">
      <Navbar />
      <main style={{ flex: 1 }}>
        {user.role === 'admin' ? <AdminPortal /> : <AuthorPortal />}
      </main>
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '16px 24px',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: 'var(--text-dim)',
          backgroundColor: 'rgba(10, 13, 20, 0.95)'
        }}
      >
        BookLeaf Publishing Support & Operations Portal • Catalog of 22,000+ Titles • AI Powered Support Engine
      </footer>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
