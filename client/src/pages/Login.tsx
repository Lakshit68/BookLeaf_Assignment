import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, ShieldCheck, UserCheck, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, quickLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuick = async (demoEmail: string, role: 'author' | 'admin') => {
    setError(null);
    setIsSubmitting(true);
    try {
      await quickLogin(demoEmail, role);
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '460px',
          width: '100%',
          padding: '36px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #00e5ff 0%, #6366f1 50%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 8px 26px rgba(0, 229, 255, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.4rem', color: '#030712' }}>
              BL
            </span>
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '6px', fontFamily: 'var(--font-heading)' }}>
            BookLeaf <span className="gradient-text-cyan">Studio</span>
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Author Operations Hub & AI Triage Nexus
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              color: '#fca5a5',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="e.g. priya.sharma@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              className="form-input"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px' }}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* 1-Click Evaluation Presets */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
          <div
            style={{
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 700,
              color: 'var(--text-dim)',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Sparkles size={14} color="#818cf8" />
            Quick 1-Click Test Accounts
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleQuick('admin@bookleaf.com', 'admin')}
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
            >
              <ShieldCheck size={16} color="#818cf8" />
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Login as Admin (Ops Team)</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>admin@bookleaf.com • Full Queue & AI Management</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuick('priya.sharma@email.com', 'author')}
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
            >
              <UserCheck size={16} color="#34d399" />
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Login as Priya Sharma (Author)</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>priya.sharma@email.com • 2 Published Books</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuick('sneha.kulkarni@email.com', 'author')}
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
            >
              <UserCheck size={16} color="#34d399" />
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Login as Sneha Kulkarni (Author)</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>sneha.kulkarni@email.com • Live Books + Book In Production</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
