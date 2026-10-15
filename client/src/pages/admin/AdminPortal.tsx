import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';
import {
  Ticket,
  TicketMessage,
  TicketNote,
  AiDraft,
  AdminStats,
  StaffMember,
  TicketCategory,
  TicketPriority,
  TicketStatus
} from '../../types';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../../components/Badges';
import {
  ShieldAlert,
  Search,
  Filter,
  Sparkles,
  Send,
  Lock,
  UserCheck,
  RefreshCw,
  Clock,
  CheckCircle,
  FileText,
  Paperclip,
  X,
  Flame,
  Layers,
  ArrowUpDown
} from 'lucide-react';

const CATEGORIES: TicketCategory[] = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry'
];

const PRIORITIES: TicketPriority[] = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES: TicketStatus[] = ['Open', 'In Progress', 'Resolved', 'Closed'];

export const AdminPortal: React.FC = () => {
  const { user } = useAuth();

  // Queue state
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'urgency' | 'latest' | 'oldest'>('urgency');

  // Selected Ticket Drawer / Modal
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [aiDraft, setAiDraft] = useState<AiDraft | null>(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isLoadingTicketDetail, setIsLoadingTicketDetail] = useState(false);

  // Active sub-tab in ticket detail: 'reply' | 'notes'
  const [detailTab, setDetailTab] = useState<'reply' | 'notes'>('reply');

  // Message & Note editing state
  const [replyMessage, setReplyMessage] = useState('');
  const [isAiAssisted, setIsAiAssisted] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Load Queue & Stats
  const loadQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const [ticketsRes, statsRes, staffRes] = await Promise.all([
        api.getTickets({
          status: statusFilter,
          category: categoryFilter,
          priority: priorityFilter,
          search: searchQuery,
          sortBy
        }),
        api.getAdminStats(),
        api.getStaff()
      ]);
      setTickets(ticketsRes.tickets);
      setStats(statsRes);
      setStaff(staffRes.staff);
    } catch (err) {
      console.error('Failed to load admin queue data:', err);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [statusFilter, categoryFilter, priorityFilter, searchQuery, sortBy]);

  // Real-time socket event listeners for Admin
  useEffect(() => {
    const handleTicketCreated = (newTicket: Ticket) => {
      setTickets(prev => [newTicket, ...prev.filter(t => t.id !== newTicket.id)]);
      api.getAdminStats().then(setStats).catch(() => {});
    };

    const handleTicketUpdated = (updatedTicket: Ticket) => {
      setTickets(prev => prev.map(t => t.id === updatedTicket.id ? { ...t, ...updatedTicket } : t));
      if (selectedTicket && selectedTicket.id === updatedTicket.id) {
        setSelectedTicket(prev => prev ? { ...prev, ...updatedTicket } : null);
      }
      api.getAdminStats().then(setStats).catch(() => {});
    };

    const handleMessageCreated = (message: TicketMessage) => {
      if (selectedTicket && selectedTicket.id === message.ticket_id) {
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
      setTickets(prev =>
        prev.map(t => (t.id === message.ticket_id ? { ...t, message_count: (t.message_count || 0) + 1 } : t))
      );
    };

    const handleNoteCreated = (note: TicketNote) => {
      if (selectedTicket && selectedTicket.id === note.ticket_id) {
        setNotes(prev => {
          if (prev.some(n => n.id === note.id)) return prev;
          return [...prev, note];
        });
      }
    };

    const unCreated = socketService.on('ticket:created', handleTicketCreated);
    const unUpdated = socketService.on('ticket:updated', handleTicketUpdated);
    const unMsg = socketService.on('message:created', handleMessageCreated);
    const unNote = socketService.on('note:created', handleNoteCreated);

    return () => {
      unCreated();
      unUpdated();
      unMsg();
      unNote();
    };
  }, [selectedTicket]);

  // Open ticket drawer & load details + draft
  const openTicketDrawer = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    socketService.joinTicketRoom(ticket.id);
    setIsLoadingTicketDetail(true);
    setReplyMessage('');
    setIsAiAssisted(false);

    try {
      const data = await api.getTicketById(ticket.id);
      setSelectedTicket(data.ticket);
      setMessages(data.messages);
      setNotes(data.notes);
      setAiDraft(data.latestDraft);

      // If draft exists, pre-fill editor if empty
      if (data.latestDraft && !replyMessage) {
        setReplyMessage(data.latestDraft.draft_content);
        setIsAiAssisted(true);
      }
    } catch (err) {
      console.error('Failed to load ticket details:', err);
    } finally {
      setIsLoadingTicketDetail(false);
    }
  };

  const closeTicketDrawer = () => {
    if (selectedTicket) {
      socketService.leaveTicketRoom(selectedTicket.id);
    }
    setSelectedTicket(null);
    setMessages([]);
    setNotes([]);
    setAiDraft(null);
    setReplyMessage('');
    setIsAiAssisted(false);
  };

  // Generate / Regenerate AI Draft
  const handleGenerateDraft = async () => {
    if (!selectedTicket) return;
    setIsGeneratingDraft(true);
    try {
      const res = await api.generateAiDraft(selectedTicket.id);
      setAiDraft(res.draft);
      setReplyMessage(res.draft.draft_content);
      setIsAiAssisted(true);
    } catch (err: any) {
      alert(`AI Draft generation error: ${err.message}`);
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  // Admin Overrides: Category, Priority, Status, Assignee
  const handleUpdateTicketField = async (
    field: 'category' | 'priority' | 'status' | 'assigned_to',
    value: string | null
  ) => {
    if (!selectedTicket) return;
    try {
      const res = await api.updateTicket(selectedTicket.id, { [field]: value });
      setSelectedTicket(res.ticket);
    } catch (err: any) {
      alert(`Failed to update ${field}: ${err.message}`);
    }
  };

  // Send Admin Reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    setIsSendingMessage(true);
    try {
      await api.addMessage(selectedTicket.id, replyMessage.trim(), isAiAssisted);
      setReplyMessage('');
      setIsAiAssisted(false);
    } catch (err: any) {
      alert(`Failed to send response: ${err.message}`);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Add Internal Admin Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newNote.trim()) return;

    setIsAddingNote(true);
    try {
      await api.addNote(selectedTicket.id, newNote.trim());
      setNewNote('');
    } catch (err: any) {
      alert(`Failed to add internal note: ${err.message}`);
    } finally {
      setIsAddingNote(false);
    }
  };

  return (
    <div className="main-content">
      {/* Ops Command Center Header */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '1.85rem', fontFamily: 'var(--font-heading)' }}>
              Operations Command Center
            </h1>
            <span
              className="badge"
              style={{
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                border: '1px solid rgba(99, 102, 241, 0.4)'
              }}
            >
              AI Copilot Active
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            BookLeaf Catalog Operations • 22,000+ Titles • Automated Triage & Knowledge Base Grounding
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={loadQueue}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} /> Sync Queue
          </button>
        </div>
      </div>

      {/* Top Banner / Metrics Overview */}
      {stats && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px'
            }}
          >
            <div className="stat-card" style={{ borderTop: '3px solid #6366f1' }}>
              <span className="stat-lbl">Active Queue Volume</span>
              <div className="stat-val">{stats.metrics.openTickets}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {stats.metrics.inProgressTickets} in progress • {stats.metrics.totalTickets} total lifetime
              </div>
            </div>

            <div className="stat-card" style={{ borderTop: '3px solid #ff3366' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="stat-lbl">Critical / High Severity</span>
                <Flame size={18} color="#ff3366" />
              </div>
              <div className="stat-val" style={{ color: '#ffa1b5' }}>
                {stats.metrics.criticalTickets + stats.metrics.highTickets}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#fca5a5' }}>
                {stats.metrics.criticalTickets} Critical • {stats.metrics.highTickets} High (SLA active)
              </div>
            </div>

            <div className="stat-card" style={{ borderTop: '3px solid #10b981' }}>
              <span className="stat-lbl">Resolved & Closed</span>
              <div className="stat-val" style={{ color: '#34d399' }}>
                {stats.metrics.resolvedTickets + stats.metrics.closedTickets}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {stats.metrics.resolvedTickets} resolved • {stats.metrics.closedTickets} closed
              </div>
            </div>

            <div className="stat-card" style={{ borderTop: '3px solid #00e5ff' }}>
              <span className="stat-lbl">Author Base & Catalog</span>
              <div className="stat-val" style={{ color: '#00e5ff' }}>
                {stats.metrics.totalAuthors}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Across {stats.metrics.totalBooks} published & pipeline titles
              </div>
            </div>
          </div>

          {/* Highlight for Oldest Unresolved Ticket (Requirement B) */}
          {stats.oldestUnresolved && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-lg)',
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    padding: '8px',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <ShieldAlert size={20} color="#fca5a5" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>
                      Oldest Unresolved Ticket Flag:
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#fca5a5' }}>
                      {stats.oldestUnresolved.id}
                    </span>
                    <PriorityBadge priority={stats.oldestUnresolved.priority} />
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#fca5a5' }}>
                    Author: {stats.oldestUnresolved.author_name} • "{stats.oldestUnresolved.subject}" • Waiting for{' '}
                    <strong>{stats.oldestUnresolved.age_hours} hours</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  const target = tickets.find(t => t.id === stats.oldestUnresolved?.id);
                  if (target) openTicketDrawer(target);
                }}
                className="btn btn-danger btn-sm"
              >
                Inspect Oldest Ticket →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px'
        }}
      >
        {/* Left: Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 280px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={16}
              color="var(--text-dim)"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search by ticket ID, author name, subject, or book..."
              className="form-input"
              style={{ paddingLeft: '36px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Right: Dropdown Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <select
            className="form-select"
            style={{ width: 'auto', fontSize: '0.8125rem' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Category Filter */}
          <select
            className="form-select"
            style={{ width: 'auto', fontSize: '0.8125rem' }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Priority Filter */}
          <select
            className="form-select"
            style={{ width: 'auto', fontSize: '0.8125rem' }}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">All Priorities</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {/* Sorting */}
          <select
            className="form-select"
            style={{ width: 'auto', fontSize: '0.8125rem' }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="urgency">Sort by Urgency (Critical First)</option>
            <option value="oldest">Sort by Oldest Unresolved</option>
            <option value="latest">Sort by Latest Created</option>
          </select>

          <button onClick={loadQueue} className="btn btn-secondary btn-sm" title="Refresh Ticket Queue">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Ticket Queue List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {isLoadingQueue ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading ticket queue...
          </div>
        ) : tickets.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No tickets matching the selected filters.
          </div>
        ) : (
          tickets.map((ticket) => {
            const isCritical = ticket.priority === 'Critical';
            const isUnresolved = ticket.status === 'Open' || ticket.status === 'In Progress';
            return (
              <div
                key={ticket.id}
                onClick={() => openTicketDrawer(ticket)}
                className="glass-panel"
                style={{
                  padding: '18px 22px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                  borderLeft: isCritical && isUnresolved
                    ? '4px solid #ef4444'
                    : ticket.priority === 'High' && isUnresolved
                    ? '4px solid #f97316'
                    : '4px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 150ms ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
              >
                {/* Left Meta & Subject */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 340px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#818cf8', fontWeight: 700 }}>
                      {ticket.id}
                    </span>
                    <StatusBadge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} isAiOriginal={ticket.priority === ticket.ai_priority} />
                    <CategoryBadge category={ticket.category} />
                    {ticket.assigned_to && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          color: 'var(--text-muted)'
                        }}
                      >
                        Assigned: {ticket.assignee_name || 'Ops Member'}
                      </span>
                    )}
                  </div>

                  <h4 style={{ fontSize: '1.05rem', color: '#ffffff' }}>{ticket.subject}</h4>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Author: <strong style={{ color: '#ffffff' }}>{ticket.author_name}</strong> ({ticket.author_email})
                    {ticket.book_title && <span> • Book: <em>"{ticket.book_title}"</em></span>}
                  </div>
                </div>

                {/* Right Badges & Timestamps */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    <div>Received: {new Date(ticket.created_at).toLocaleDateString()}</div>
                    <div style={{ color: '#818cf8', fontWeight: 600 }}>
                      {ticket.message_count || 0} messages • {ticket.note_count || 0} notes
                    </div>
                  </div>

                  <button className="btn btn-secondary btn-sm">
                    Open Ticket →
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ADMIN TICKET DETAILS & AI DRAFTING DRAWER / MODAL */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={closeTicketDrawer}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '960px', maxHeight: '92vh' }}
          >
            {/* Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border-subtle)',
                backgroundColor: 'rgba(16, 21, 34, 0.95)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: '#818cf8', fontWeight: 700 }}>
                    {selectedTicket.id}
                  </span>
                  <StatusBadge status={selectedTicket.status} />
                  <PriorityBadge priority={selectedTicket.priority} />
                  <CategoryBadge category={selectedTicket.category} />
                </div>
                <h3 style={{ fontSize: '1.3rem', color: '#ffffff' }}>{selectedTicket.subject}</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Created on {new Date(selectedTicket.created_at).toLocaleString()} • Author: {selectedTicket.author_name} ({selectedTicket.author_email})
                </div>
              </div>

              <button onClick={closeTicketDrawer} className="btn btn-ghost btn-sm">
                <X size={18} />
              </button>
            </div>

            {/* Main Drawer Body: Split Layout */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(300px, 1.4fr) minmax(260px, 1fr)',
                overflowY: 'auto',
                flex: 1
              }}
            >
              {/* LEFT COLUMN: Query, Conversation History, and Response Editor */}
              <div
                style={{
                  padding: '24px',
                  borderRight: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  overflowY: 'auto'
                }}
              >
                {/* Original Query Box */}
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Original Query by {selectedTicket.author_name}
                  </div>
                  <p style={{ fontSize: '0.9rem', color: '#f1f5f9', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {selectedTicket.description}
                  </p>

                  {selectedTicket.attachment_url && (
                    <div style={{ marginTop: '10px' }}>
                      <a
                        href={selectedTicket.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Paperclip size={13} />
                        <span>Attachment: {selectedTicket.attachment_filename || 'Download'}</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Sub-tab Switcher: Public Response Thread vs Internal Notes */}
                <div
                  style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--border-subtle)',
                    gap: '16px',
                    paddingBottom: '8px'
                  }}
                >
                  <button
                    onClick={() => setDetailTab('reply')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: detailTab === 'reply' ? '#818cf8' : 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      borderBottom: detailTab === 'reply' ? '2px solid #818cf8' : '2px solid transparent',
                      paddingBottom: '6px'
                    }}
                  >
                    Author Thread ({messages.length})
                  </button>

                  <button
                    onClick={() => setDetailTab('notes')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: detailTab === 'notes' ? '#f59e0b' : 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderBottom: detailTab === 'notes' ? '2px solid #f59e0b' : '2px solid transparent',
                      paddingBottom: '6px'
                    }}
                  >
                    <Lock size={13} />
                    Internal Notes ({notes.length})
                  </button>
                </div>

                {/* TAB CONTENT: AUTHOR REPLY THREAD */}
                {detailTab === 'reply' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Previous messages */}
                    {messages.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            style={{
                              backgroundColor: msg.sender_role === 'admin' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                              border: msg.sender_role === 'admin' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--border-subtle)',
                              borderRadius: 'var(--radius-md)',
                              padding: '14px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.75rem' }}>
                              <span style={{ fontWeight: 600, color: msg.sender_role === 'admin' ? '#818cf8' : '#34d399' }}>
                                {msg.sender_role === 'admin' ? `BookLeaf Support (${msg.sender_name || 'Admin'})` : selectedTicket.author_name}
                              </span>
                              <span style={{ color: 'var(--text-dim)' }}>
                                {new Date(msg.created_at).toLocaleString()}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#f8fafc' }}>
                              {msg.message}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* AI Draft Card (Requirement B & D) */}
                    <div className="ai-draft-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Sparkles size={16} color="#a855f7" />
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ffffff' }}>
                            AI-Drafted Response (BookLeaf Knowledge Base)
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {aiDraft && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                              ~{aiDraft.token_count} tokens • {aiDraft.model_used}
                            </span>
                          )}
                          <button
                            onClick={handleGenerateDraft}
                            disabled={isGeneratingDraft}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                          >
                            <RefreshCw size={12} className={isGeneratingDraft ? 'animate-spin' : ''} />
                            {isGeneratingDraft ? 'Generating...' : 'Regenerate Draft'}
                          </button>
                        </div>
                      </div>

                      {aiDraft ? (
                        <div>
                          <div
                            style={{
                              backgroundColor: 'rgba(10, 14, 23, 0.7)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '12px',
                              fontSize: '0.825rem',
                              lineHeight: 1.6,
                              color: '#cbd5e1',
                              maxHeight: '180px',
                              overflowY: 'auto',
                              whiteSpace: 'pre-wrap',
                              fontFamily: 'var(--font-sans)'
                            }}
                          >
                            {aiDraft.draft_content}
                          </div>

                          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => {
                                setReplyMessage(aiDraft.draft_content);
                                setIsAiAssisted(true);
                              }}
                              className="btn btn-emerald btn-sm"
                              style={{ fontSize: '0.75rem' }}
                            >
                              <FileText size={13} /> Copy Draft to Editor
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Click "Regenerate Draft" to craft a contextual response using the BookLeaf Knowledge Base.
                        </div>
                      )}
                    </div>

                    {/* Reply Editor Form */}
                    <form onSubmit={handleSendReply}>
                      <div className="form-group" style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <label className="form-label" style={{ margin: 0 }}>
                            Edit and Send Response to Author
                          </label>
                          {isAiAssisted && (
                            <span style={{ fontSize: '0.7rem', color: '#a855f7', fontWeight: 600 }}>
                              ✦ AI Draft Applied (editable)
                            </span>
                          )}
                        </div>
                        <textarea
                          required
                          className="form-textarea"
                          rows={6}
                          placeholder="Type or customize the response to the author..."
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          Sending will broadcast in real time to the author's screen.
                        </span>
                        <button
                          type="submit"
                          disabled={isSendingMessage || !replyMessage.trim()}
                          className="btn btn-primary"
                        >
                          <Send size={15} /> Send Response
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* TAB CONTENT: INTERNAL ADMIN NOTES */}
                {detailTab === 'notes' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div
                      style={{
                        padding: '10px 14px',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.8rem',
                        color: '#fcd34d',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Lock size={15} style={{ flexShrink: 0 }} />
                      <span>Internal notes are private and NEVER visible to authors.</span>
                    </div>

                    {notes.length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontSize: '0.85rem' }}>
                        No internal notes added yet.
                      </div>
                    ) : (
                      notes.map((note) => (
                        <div
                          key={note.id}
                          style={{
                            backgroundColor: 'rgba(245, 158, 11, 0.06)',
                            border: '1px solid rgba(245, 158, 11, 0.2)',
                            borderRadius: 'var(--radius-md)',
                            padding: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.75rem' }}>
                            <span style={{ fontWeight: 600, color: '#f59e0b' }}>{note.admin_name || 'Admin Ops'}</span>
                            <span style={{ color: 'var(--text-dim)' }}>{new Date(note.created_at).toLocaleString()}</span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#f1f5f9' }}>{note.note}</div>
                        </div>
                      ))
                    )}

                    <form onSubmit={handleAddNote}>
                      <div className="form-group" style={{ marginBottom: '8px' }}>
                        <textarea
                          required
                          className="form-textarea"
                          rows={3}
                          placeholder="Add private note (e.g. Escalate to Repro Delhi facility, verify bank IFSC code)..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" disabled={isAddingNote || !newNote.trim()} className="btn btn-secondary btn-sm">
                          <Lock size={13} /> Add Internal Note
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Ticket Management & Context Metadata */}
              <div
                style={{
                  padding: '24px',
                  backgroundColor: 'rgba(10, 13, 20, 0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  overflowY: 'auto'
                }}
              >
                {/* Management Controls Box */}
                <div>
                  <h4 style={{ fontSize: '0.9rem', color: '#ffffff', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Ticket Management
                  </h4>

                  {/* Status update */}
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">Update Status</label>
                    <select
                      className="form-select"
                      value={selectedTicket.status}
                      onChange={(e) => handleUpdateTicketField('status', e.target.value)}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Priority Override (Requirement B) */}
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">
                      <span>Priority Score</span>
                      <span style={{ fontSize: '0.7rem', color: '#818cf8' }}>
                        AI: {selectedTicket.ai_priority}
                      </span>
                    </label>
                    <select
                      className="form-select"
                      value={selectedTicket.priority}
                      onChange={(e) => handleUpdateTicketField('priority', e.target.value)}
                    >
                      {PRIORITIES.map(p => <option key={p} value={p}>{p} {p === selectedTicket.ai_priority ? '(AI)' : ''}</option>)}
                    </select>
                  </div>

                  {/* Category Override (Requirement B) */}
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">
                      <span>Category Classification</span>
                      <span style={{ fontSize: '0.7rem', color: '#818cf8' }}>
                        AI: {selectedTicket.ai_category}
                      </span>
                    </label>
                    <select
                      className="form-select"
                      value={selectedTicket.category}
                      onChange={(e) => handleUpdateTicketField('category', e.target.value)}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Assign to Admin Staff */}
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">Assignee</label>
                    <select
                      className="form-select"
                      value={selectedTicket.assigned_to || ''}
                      onChange={(e) => handleUpdateTicketField('assigned_to', e.target.value || null)}
                    >
                      <option value="">Unassigned</option>
                      {staff.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.active_tickets} active tickets)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Author Profile Metadata Card */}
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Author Profile
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff' }}>
                    {selectedTicket.author_name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {selectedTicket.author_email}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    Location: {selectedTicket.author_city || 'India'} • Phone: {selectedTicket.author_phone || 'N/A'}
                  </div>
                </div>

                {/* Linked Book Metadata Card */}
                {selectedTicket.book_title ? (
                  <div
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8', marginBottom: '8px', textTransform: 'uppercase' }}>
                      Associated Book Data
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                      {selectedTicket.book_title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Status: <strong style={{ color: '#ffffff' }}>{selectedTicket.book_status}</strong>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                      ISBN: {selectedTicket.book_isbn || 'Pending'}
                    </div>

                    <div
                      style={{
                        marginTop: '12px',
                        padding: '10px',
                        backgroundColor: 'rgba(16, 185, 129, 0.06)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '8px',
                        fontSize: '0.75rem'
                      }}
                    >
                      <div>
                        <span style={{ color: 'var(--text-dim)', display: 'block' }}>Copies Sold</span>
                        <strong style={{ color: '#ffffff', fontSize: '0.9rem' }}>
                          {selectedTicket.book_total_copies_sold || 0}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-dim)', display: 'block' }}>Pending Royalty</span>
                        <strong style={{ color: '#fcd34d', fontSize: '0.9rem' }}>
                          ₹{(selectedTicket.book_royalty_pending || 0).toLocaleString('en-IN')}
                        </strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                      fontSize: '0.8rem',
                      color: 'var(--text-dim)'
                    }}
                  >
                    No specific book attached. Ticket classified as General Account Inquiry.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
