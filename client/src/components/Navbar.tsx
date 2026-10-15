import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { socketService } from '../services/socket';
import { BookOpen, ShieldCheck, UserCheck, LogOut, FileText, RefreshCw, ChevronDown } from 'lucide-react';
import { api } from '../services/api';

export const Navbar: React.FC = () => {
  const { user, logout, quickLogin } = useAuth();
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(socketService.isConnected());
  const [showDemoModal, setShowDemoModal] = useState<boolean>(false);
  const [demoUsers, setDemoUsers] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = socketService.on('connection_change', (connected: boolean) => {
      setIsSocketConnected(connected);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleOpenDemoModal = async () => {
    try {
      const data = await api.getDemoUsers();
      setDemoUsers(data.users);
      setShowDemoModal(true);
    } catch (err) {
      console.error('Failed to load demo users:', err);
    }
  };

  const handleSelectUser = async (email: string, role: 'author' | 'admin') => {
    await quickLogin(email, role);
    setShowDemoModal(false);
  };

  return (
    <>
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(10, 13, 20, 0.85)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '12px 24px'
        }}
      >
        <div
          style={{
            maxWidth: '1380px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}
        >
          {/* Logo & Portal Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '11px',
                background: 'linear-gradient(135deg, #00e5ff 0%, #6366f1 50%, #a855f7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(0, 229, 255, 0.35)',
                position: 'relative'
              }}
            >
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.1rem', color: '#030712' }}>
                BL
              </span>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.15rem', letterSpacing: '-0.02em', color: '#ffffff' }}>
                  BookLeaf
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    padding: '2px 7px',
                    borderRadius: 'var(--radius-xs)',
                    background: 'rgba(0, 229, 255, 0.12)',
                    color: '#00e5ff',
                    border: '1px solid rgba(0, 229, 255, 0.3)',
                    textTransform: 'uppercase'
                  }}
                >
                  STUDIO
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {user?.role === 'admin' ? (
                  <span style={{ color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    <ShieldCheck size={13} /> Operations Command Center
                  </span>
                ) : (
                  <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    <UserCheck size={13} /> Author Creator Hub
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Action Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Live WebSocket Status Dot */}
            <div
              title={isSocketConnected ? 'Real-time WebSocket Live' : 'Reconnecting WebSocket...'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.75rem',
                color: isSocketConnected ? '#6ee7b7' : '#fca5a5'
              }}
            >
              <span className={`status-dot ${isSocketConnected ? 'status-dot-online' : 'status-dot-offline'}`} />
              <span style={{ display: 'none', md: 'inline' } as any}>
                {isSocketConnected ? 'Live Real-time' : 'Connecting'}
              </span>
            </div>

            {/* API Docs Button */}
            <a
              href="/api/docs"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm"
              title="Open OpenAPI / Swagger interactive documentation"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
            >
              <FileText size={15} />
              <span>API Docs</span>
            </a>

            {/* Quick Demo Switcher */}
            <button
              onClick={handleOpenDemoModal}
              className="btn btn-secondary btn-sm"
              title="Switch user account to test author or admin views"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} />
              <span>Switch Demo User</span>
              <ChevronDown size={14} />
            </button>

            {/* Current User Pill */}
            {user && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '4px 10px 4px 6px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: user.role === 'admin' ? '#4f46e5' : '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    color: '#ffffff'
                  }}
                >
                  {user.name.charAt(0)}
                </div>
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#ffffff' }}>{user.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user.role}</div>
                </div>
              </div>
            )}

            {/* Logout */}
            <button
              onClick={logout}
              className="btn btn-ghost btn-sm"
              title="Log out of current account"
              style={{ color: '#f87171' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Demo User Switcher Modal */}
      {showDemoModal && (
        <div className="modal-overlay" onClick={() => setShowDemoModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px', padding: '24px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem' }}>Switch Demo Account</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Test author-facing features or admin-facing workflows in 1-click
                </p>
              </div>
              <button onClick={() => setShowDemoModal(false)} className="btn btn-ghost btn-sm">
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
              {demoUsers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleSelectUser(u.email, u.role)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: u.id === user?.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: u.id === user?.id ? '1px solid var(--accent-indigo)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 150ms ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.07)')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      u.id === user?.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)')
                  }
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: u.role === 'admin' ? '#4338ca' : '#047857',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        color: '#ffffff'
                      }}
                    >
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ffffff' }}>
                        {u.name}{' '}
                        {u.id === user?.id && (
                          <span style={{ fontSize: '0.7rem', color: '#818cf8', marginLeft: '6px' }}>(Active)</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {u.email} • {u.city || 'India'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {u.role === 'admin' ? (
                      <span className="badge badge-priority-critical">Admin Lead</span>
                    ) : (
                      <span className="badge badge-status-in-progress">
                        {u.book_count} Book{u.book_count > 1 ? 's' : ''} • {u.ticket_count} Ticket{u.ticket_count > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDemoModal(false)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
