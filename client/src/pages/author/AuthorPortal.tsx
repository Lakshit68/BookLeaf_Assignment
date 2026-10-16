import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';
import { Book, BooksSummary, Ticket, TicketMessage } from '../../types';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../../components/Badges';
import {
  BookOpen,
  Send,
  Ticket as TicketIcon,
  DollarSign,
  Clock,
  CheckCircle,
  Paperclip,
  X,
  MessageSquare,
  FileUp,
  Sparkles,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export const AuthorPortal: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'books' | 'submit' | 'tickets'>('books');

  // Books State
  const [books, setBooks] = useState<Book[]>([]);
  const [booksSummary, setBooksSummary] = useState<BooksSummary | null>(null);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);

  // Tickets State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Submit Ticket Form State
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentData, setAttachmentData] = useState<{ url: string; filename: string } | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load initial data
  const loadBooks = async () => {
    setIsLoadingBooks(true);
    try {
      const data = await api.getMyBooks();
      setBooks(data.books);
      setBooksSummary(data.summary);
    } catch (err) {
      console.error('Failed to load books:', err);
    } finally {
      setIsLoadingBooks(false);
    }
  };
  const loadTickets = async () => {
    setIsLoadingTickets(true);
    try {
      const data = await api.getTickets();
      setTickets(data.tickets);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  useEffect(() => {
    loadBooks();
    loadTickets();
  }, [user]);

  // Real-time socket event listeners for instant updates without page refresh
  useEffect(() => {
    const handleTicketCreated = (newTicket: Ticket) => {
      setTickets(prev => [newTicket, ...prev.filter(t => t.id !== newTicket.id)]);
    };

    const handleTicketUpdated = (updatedTicket: Ticket) => {
      setTickets(prev => prev.map(t => t.id === updatedTicket.id ? { ...t, ...updatedTicket } : t));
      if (selectedTicket && selectedTicket.id === updatedTicket.id) {
        setSelectedTicket(prev => prev ? { ...prev, ...updatedTicket } : null);
      }
    };

    const handleMessageCreated = (message: TicketMessage) => {
      if (selectedTicket && selectedTicket.id === message.ticket_id) {
        setTicketMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
      // Increment ticket message badge
      setTickets(prev =>
        prev.map(t =>
          t.id === message.ticket_id ? { ...t, message_count: (t.message_count || 0) + 1 } : t
        )
      );
    };

    const unCreated = socketService.on('ticket:created', handleTicketCreated);
    const unUpdated = socketService.on('ticket:updated', handleTicketUpdated);
    const unMsg = socketService.on('message:created', handleMessageCreated);

    return () => {
      unCreated();
      unUpdated();
      unMsg();
    };
  }, [selectedTicket]);

  // Open ticket thread modal
  const openTicketModal = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    socketService.joinTicketRoom(ticket.id);
    setIsLoadingMessages(true);
    try {
      const data = await api.getTicketById(ticket.id);
      setTicketMessages(data.messages);
    } catch (err) {
      console.error('Failed to load ticket messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const closeTicketModal = () => {
    if (selectedTicket) {
      socketService.leaveTicketRoom(selectedTicket.id);
    }
    setSelectedTicket(null);
    setTicketMessages([]);
    setReplyText('');
  };

  // Author send reply in conversation
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setIsSendingReply(true);
    try {
      await api.addMessage(selectedTicket.id, replyText.trim(), false);
      setReplyText('');
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setIsSendingReply(false);
    }
  };

  // Author resolve/close ticket
  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    if (!confirm('Are you sure you want to mark this ticket as Closed?')) return;

    try {
      await api.updateTicket(selectedTicket.id, { status: 'Closed' });
      setSelectedTicket(prev => prev ? { ...prev, status: 'Closed' } : null);
    } catch (err: any) {
      alert(err.message || 'Failed to close ticket');
    }
  };

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setAttachmentFile(file);
    setIsUploadingFile(true);
    try {
      const result = await api.uploadAttachment(file);
      setAttachmentData({ url: result.url, filename: result.filename });
    } catch (err: any) {
      alert(`File upload failed: ${err.message}`);
      setAttachmentFile(null);
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Handle support ticket creation
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);
    setIsSubmittingTicket(true);

    try {
      const result = await api.createTicket({
        book_id: selectedBookId || null,
        subject,
        description,
        attachment_url: attachmentData?.url || null,
        attachment_filename: attachmentData?.filename || null
      });

      setSubmitSuccess(
        `Ticket #${result.ticket.id} submitted successfully! Auto-classified as "${result.classification.category}" (${result.classification.priority} Priority). Our operations team has been notified.`
      );

      // Reset form
      setSubject('');
      setDescription('');
      setSelectedBookId('');
      setAttachmentFile(null);
      setAttachmentData(null);

      // Reload tickets and switch tab after short delay
      await loadTickets();
      setTimeout(() => {
        setActiveTab('tickets');
        setSubmitSuccess(null);
      }, 2500);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit support query');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  return (
    <div className="main-content">
      {/* Author Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '1.85rem', fontFamily: 'var(--font-heading)' }}>
              Creator Studio — <span className="gradient-text-cyan">{user?.name}</span>
            </h1>
            <span className="badge badge-status-resolved" style={{ background: 'rgba(0, 229, 255, 0.1)', color: '#00e5ff', borderColor: 'rgba(0, 229, 255, 0.3)' }}>
              Author Portal
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Author ID: <span style={{ fontFamily: 'var(--font-mono)', color: '#00e5ff' }}>{user?.id}</span> • {user?.email} • Publishing Partner Since {user?.joined_date || '2023'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            gap: '4px'
          }}
        >
          <button
            onClick={() => setActiveTab('books')}
            className={`btn btn-sm ${activeTab === 'books' ? 'btn-primary' : 'btn-ghost'}`}
          >
            <Layers size={14} />
            My Titles ({books.length})
          </button>
          <button
            onClick={() => setActiveTab('submit')}
            className={`btn btn-sm ${activeTab === 'submit' ? 'btn-primary' : 'btn-ghost'}`}
          >
            <Send size={14} />
            New Query
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`btn btn-sm ${activeTab === 'tickets' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ position: 'relative' }}
          >
            <TicketIcon size={14} />
            Support Stream ({tickets.length})
            {tickets.some(t => t.status === 'Open' || t.status === 'In Progress') && (
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  backgroundColor: '#00e5ff',
                  borderRadius: '50%',
                  display: 'inline-block',
                  marginLeft: '4px',
                  boxShadow: '0 0 8px #00e5ff'
                }}
              />
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: MY BOOKS (CREATOR STUDIO RELEASES) */}
      {activeTab === 'books' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Summary Metric Cards */}
          {booksSummary && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px'
              }}
            >
              <div className="stat-card" style={{ borderTop: '3px solid #6366f1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="stat-lbl">Published Catalog Titles</span>
                  <BookOpen size={18} color="#818cf8" />
                </div>
                <div className="stat-val">{booksSummary.publishedBooks}</div>
                {booksSummary.inProductionBooks > 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
                    ⚡ {booksSummary.inProductionBooks} In Production Pipeline
                  </div>
                )}
              </div>

              <div className="stat-card" style={{ borderTop: '3px solid #00e5ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="stat-lbl">Global Units Distributed</span>
                  <Layers size={18} color="#00e5ff" />
                </div>
                <div className="stat-val" style={{ color: '#00e5ff' }}>
                  {booksSummary.totalCopiesSold.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Across Amazon, Flipkart & BookLeaf Store
                </div>
              </div>

              <div className="stat-card" style={{ borderTop: '3px solid #10b981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="stat-lbl">Total Royalties Earned</span>
                  <DollarSign size={18} color="#10b981" />
                </div>
                <div className="stat-val" style={{ color: '#34d399' }}>
                  ₹{booksSummary.totalRoyaltyEarned.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  BookLeaf 80/20 Net Profit Allocation
                </div>
              </div>

              <div className="stat-card" style={{ borderTop: '3px solid #f59e0b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="stat-lbl">Pending Quarterly Payout</span>
                  <Clock size={18} color="#f59e0b" />
                </div>
                <div className="stat-val" style={{ color: '#fcd34d' }}>
                  ₹{booksSummary.totalRoyaltyPending.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {booksSummary.totalRoyaltyPending >= 1000
                    ? 'Eligible for next quarterly bank transfer'
                    : 'Below ₹1,000 threshold (accumulates to next cycle)'}
                </div>
              </div>
            </div>
          )}

          {/* Book Catalog Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)' }}>
                  Release Studio & Distribution Status
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Production pipeline progression, channel availability, and royalty yields
                </p>
              </div>
              <button
                onClick={() => setActiveTab('submit')}
                className="btn btn-primary btn-sm"
              >
                <Send size={14} /> Open Support Query
              </button>
            </div>

            {isLoadingBooks ? (
              <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading release studio catalog...
              </div>
            ) : books.length === 0 ? (
              <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No titles registered under this author profile.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '20px' }}>
                {books.map((b) => {
                  const isInProduction = b.status.includes('Production');
                  return (
                    <div
                      key={b.id}
                      className="glass-panel"
                      style={{
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        borderTop: isInProduction
                          ? '3px solid #f59e0b'
                          : '3px solid #00e5ff',
                        position: 'relative'
                      }}
                    >
                      <div>
                        {/* Title Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                          <div>
                            <h4 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '4px', fontFamily: 'var(--font-heading)' }}>
                              {b.title}
                            </h4>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              Genre: <span style={{ color: '#e2e8f0' }}>{b.genre}</span> • ID:{' '}
                              <span style={{ fontFamily: 'var(--font-mono)', color: '#818cf8' }}>{b.id}</span>
                            </div>
                          </div>
                          {isInProduction ? (
                            <span className="badge badge-priority-medium">{b.status}</span>
                          ) : (
                            <span className="badge badge-status-resolved" style={{ background: 'rgba(0, 229, 255, 0.1)', color: '#00e5ff', borderColor: 'rgba(0, 229, 255, 0.3)' }}>
                              ● Live on Channels
                            </span>
                          )}
                        </div>

                        {/* Pipeline Progress Step Track (For Books in Production) */}
                        {isInProduction ? (
                          <div style={{ margin: '14px 0', padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                            <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                              Production Lifecycle Pipeline
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 600 }}>
                                ✓ Manuscript
                              </span>
                              <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>→</span>
                              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontWeight: 700, border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                                ● {b.status.replace('In Production - ', '')} (Active)
                              </span>
                              <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>→</span>
                              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-dim)' }}>
                                Proofing
                              </span>
                              <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>→</span>
                              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-dim)' }}>
                                Global Live
                              </span>
                            </div>
                          </div>
                        ) : null}

                        {/* Specs Grid */}
                        <div
                          style={{
                            marginTop: '12px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '10px',
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            padding: '12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ISBN</span>
                            <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                              {b.isbn || 'Pending ISBN Allocation'}
                            </span>
                          </div>

                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Release Date
                            </span>
                            <span style={{ fontSize: '0.85rem' }}>
                              {b.publication_date || 'In Production Pipeline'}
                            </span>
                          </div>

                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Retail Pricing & Yield
                            </span>
                            <span style={{ fontSize: '0.85rem' }}>
                              {b.mrp ? `₹${b.mrp} MRP (₹${b.author_royalty_per_copy}/copy yield)` : 'Calculated upon proof approval'}
                            </span>
                          </div>

                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Fulfillment Partner
                            </span>
                            <span style={{ fontSize: '0.85rem' }}>{b.print_partner || 'BookLeaf Delhi Ops'}</span>
                          </div>
                        </div>

                        {/* Royalty Financials (Published Books) */}
                        {!isInProduction && (
                          <div
                            style={{
                              marginTop: '12px',
                              padding: '12px',
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: 'rgba(0, 229, 255, 0.05)',
                              border: '1px solid rgba(0, 229, 255, 0.18)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Copies Shipped</div>
                              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-heading)' }}>
                                {b.total_copies_sold.toLocaleString('en-IN')}
                              </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Royalty</div>
                              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#00e5ff', fontFamily: 'var(--font-heading)' }}>
                                ₹{b.total_royalty_earned.toLocaleString('en-IN')}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pending Payout</div>
                              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fcd34d', fontFamily: 'var(--font-heading)' }}>
                                ₹{b.royalty_pending.toLocaleString('en-IN')}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Distribution Channel Pills */}
                        {b.available_on && b.available_on.length > 0 && (
                          <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginRight: '4px' }}>CHANNELS:</span>
                            {b.available_on.map((ch, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-full)',
                                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                  color: '#cbd5e1',
                                  border: '1px solid rgba(255, 255, 255, 0.08)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00e5ff' }} />
                                {ch}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Quick Action */}
                      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => {
                            setSelectedBookId(b.id);
                            setSubject(`Support inquiry regarding ${b.title}`);
                            setActiveTab('submit');
                          }}
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span>Ask support about this book</span>
                          <ArrowUpRight size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SUBMIT A SUPPORT QUERY */}
      {activeTab === 'submit' && (
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '6px' }}>Submit a Support Query</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Our operations team and AI support system are here to help. Select the relevant book or submit a
                general account question.
              </p>
            </div>

            {submitSuccess && (
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#6ee7b7',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}
              >
                <CheckCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 600 }}>Success</div>
                  <div style={{ fontSize: '0.85rem' }}>{submitSuccess}</div>
                </div>
              </div>
            )}

            {submitError && (
              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  marginBottom: '20px'
                }}
              >
                {submitError}
              </div>
            )}

            <form onSubmit={handleCreateTicket}>
              {/* Book Dropdown */}
              <div className="form-group">
                <label className="form-label">
                  <span>Which book is this query about?</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Optional</span>
                </label>
                <select
                  className="form-select"
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                >
                  <option value="">General / Account Level (No specific book)</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Line */}
              <div className="form-group">
                <label className="form-label">
                  <span>Subject Line</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Min 3 characters</span>
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Royalty payout inquiry for Q3, or ISBN mismatch on Amazon"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              {/* Detailed Description Field */}
              <div className="form-group">
                <label className="form-label">
                  <span>Detailed Query Description</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Min 10 characters</span>
                </label>
                <textarea
                  required
                  className="form-textarea"
                  placeholder="Please describe your question or issue in detail. If this is a printing issue, describe any defects. If it is a royalty question, mention any specific dates or amounts..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Optional File Attachment Support */}
              <div className="form-group">
                <label className="form-label">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Paperclip size={14} /> Optional File Attachment (Photos of prints, statements, proofs)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Bonus Feature Active</span>
                </label>

                <div
                  style={{
                    border: '1px dashed var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    textAlign: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {attachmentData ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        padding: '8px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      <CheckCircle size={16} color="#34d399" />
                      <span style={{ fontSize: '0.85rem', color: '#ffffff' }}>{attachmentData.filename}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachmentFile(null);
                          setAttachmentData(null);
                        }}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <FileUp size={24} color="#818cf8" />
                      <label
                        htmlFor="file-upload"
                        className="btn btn-secondary btn-sm"
                        style={{ cursor: isUploadingFile ? 'wait' : 'pointer' }}
                      >
                        {isUploadingFile ? 'Uploading file...' : 'Choose File to Attach'}
                      </label>
                      <input
                        id="file-upload"
                        type="file"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        accept="image/*,.pdf,.doc,.docx"
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        Supports Images (PNG, JPG), PDF, DOC up to 10MB
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={isSubmittingTicket || isUploadingFile}
                  className="btn btn-primary"
                  style={{ minWidth: '180px' }}
                >
                  {isSubmittingTicket ? (
                    <>
                      <Sparkles size={16} className="animate-spin" /> Auto-Classifying...
                    </>
                  ) : (
                    <>
                      <Send size={16} /> Submit Support Ticket
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: MY TICKETS */}
      {activeTab === 'tickets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.3rem' }}>My Support Tickets</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Updates stream in real time. Click any ticket to view responses or write back.
              </p>
            </div>
            <button onClick={() => setActiveTab('submit')} className="btn btn-primary btn-sm">
              <Send size={14} /> Submit New Ticket
            </button>
          </div>

          {isLoadingTickets ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading support tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
              <TicketIcon size={36} color="var(--text-dim)" style={{ margin: '0 auto 12px auto' }} />
              <h4 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>No Support Queries Raised Yet</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
                Have a question regarding royalties, ISBNs, printing, or distribution?
              </p>
              <button onClick={() => setActiveTab('submit')} className="btn btn-emerald btn-sm">
                Submit Your First Ticket
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => openTicketModal(t)}
                  className="glass-panel"
                  style={{
                    padding: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    transition: 'all 150ms ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#818cf8', fontWeight: 600 }}>
                        {t.id}
                      </span>
                      <StatusBadge status={t.status} />
                      <CategoryBadge category={t.category} />
                      <PriorityBadge priority={t.priority} />
                    </div>

                    <h4 style={{ fontSize: '1.05rem', color: '#ffffff' }}>{t.subject}</h4>

                    <p
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}
                    >
                      {t.description}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      <span>Submitted: {new Date(t.created_at).toLocaleDateString()}</span>
                      {t.book_title && <span>Book: {t.book_title}</span>}
                      {t.attachment_filename && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#818cf8' }}>
                          <Paperclip size={12} /> {t.attachment_filename}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)'
                      }}
                    >
                      <MessageSquare size={14} color="#818cf8" />
                      <span>{t.message_count || 0} response{(t.message_count || 0) === 1 ? '' : 's'}</span>
                    </div>

                    <button className="btn btn-secondary btn-sm">
                      View Thread →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TICKET DETAILS & REAL-TIME THREAD MODAL */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={closeTicketModal}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '850px', maxHeight: '88vh' }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                backgroundColor: 'rgba(16, 21, 34, 0.95)'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#818cf8', fontWeight: 600 }}>
                    {selectedTicket.id}
                  </span>
                  <StatusBadge status={selectedTicket.status} />
                  <CategoryBadge category={selectedTicket.category} />
                  <PriorityBadge priority={selectedTicket.priority} />
                </div>
                <h3 style={{ fontSize: '1.25rem', color: '#ffffff' }}>{selectedTicket.subject}</h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {selectedTicket.book_title ? `Associated Book: ${selectedTicket.book_title}` : 'General Account Query'} • Submitted on {new Date(selectedTicket.created_at).toLocaleString()}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedTicket.status !== 'Closed' && (
                  <button
                    onClick={handleCloseTicket}
                    className="btn btn-secondary btn-sm"
                    title="Mark this ticket as resolved & closed"
                  >
                    Mark Resolved
                  </button>
                )}
                <button onClick={closeTicketModal} className="btn btn-ghost btn-sm">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Conversation Messages Body */}
            <div
              style={{
                padding: '24px',
                overflowY: 'auto',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '18px'
              }}
            >
              {/* Original Author Query */}
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  borderLeft: '4px solid #6366f1'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#ffffff' }}>
                    Original Query ({user?.name})
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {new Date(selectedTicket.created_at).toLocaleString()}
                  </span>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#e2e8f0', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {selectedTicket.description}
                </p>

                {selectedTicket.attachment_url && (
                  <div style={{ marginTop: '12px' }}>
                    <a
                      href={selectedTicket.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Paperclip size={14} />
                      <span>Attached: {selectedTicket.attachment_filename || 'Attachment file'}</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Thread Responses */}
              {isLoadingMessages ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                  Loading conversation history...
                </div>
              ) : ticketMessages.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '24px',
                    backgroundColor: 'rgba(99, 102, 241, 0.05)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px dashed rgba(99, 102, 241, 0.2)'
                  }}
                >
                  <Clock size={24} color="#818cf8" style={{ margin: '0 auto 8px auto' }} />
                  <div style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: 600 }}>
                    Waiting for BookLeaf Operations Response
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Our team is reviewing your query. AI response drafting is active. You will see replies appear here in real time!
                  </div>
                </div>
              ) : (
                ticketMessages.map((msg) => {
                  const isAdmin = msg.sender_role === 'admin';
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignSelf: isAdmin ? 'flex-start' : 'flex-end',
                        maxWidth: '85%'
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-dim)',
                          marginBottom: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          justifyContent: isAdmin ? 'flex-start' : 'flex-end'
                        }}
                      >
                        <span style={{ fontWeight: 600, color: isAdmin ? '#818cf8' : '#34d399' }}>
                          {isAdmin ? 'BookLeaf Author Support Team' : 'You (Author)'}
                        </span>
                        {msg.is_ai_assisted === 1 && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              backgroundColor: 'rgba(99, 102, 241, 0.2)',
                              color: '#c7d2fe',
                              padding: '1px 6px',
                              borderRadius: '4px'
                            }}
                          >
                            AI Verified
                          </span>
                        )}
                        <span>• {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        style={{
                          backgroundColor: isAdmin ? 'rgba(30, 41, 59, 0.85)' : 'rgba(99, 102, 241, 0.18)',
                          border: isAdmin ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(99, 102, 241, 0.35)',
                          borderRadius: 'var(--radius-lg)',
                          padding: '16px',
                          fontSize: '0.9rem',
                          color: '#f8fafc',
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.6
                        }}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply Input Bar */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border-subtle)',
                backgroundColor: 'rgba(16, 21, 34, 0.95)'
              }}
            >
              {selectedTicket.status === 'Closed' ? (
                <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  This ticket has been marked Closed. If you need further assistance, please open a new query.
                </div>
              ) : (
                <form onSubmit={handleSendReply} style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Write a follow-up reply to BookLeaf support..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={isSendingReply || !replyText.trim()}
                    className="btn btn-primary"
                  >
                    <Send size={15} /> Send
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
