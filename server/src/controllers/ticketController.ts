import { Request, Response } from 'express';
import { db } from '../db';
import { classifyAndPrioritizeTicket, generateDraftResponse } from '../services/aiService';
import { emitTicketCreated, emitTicketUpdated, emitMessageCreated, emitNoteCreated } from '../services/socketService';

export async function getTickets(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { status, category, priority, search, sortBy } = req.query;

  let query = `
    SELECT 
      t.*,
      u.name as author_name,
      u.email as author_email,
      b.title as book_title,
      b.isbn as book_isbn,
      assignee.name as assignee_name,
      (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count,
      (SELECT COUNT(*) FROM ticket_notes WHERE ticket_id = t.id) as note_count
    FROM tickets t
    JOIN users u ON t.author_id = u.id
    LEFT JOIN books b ON t.book_id = b.id
    LEFT JOIN users assignee ON t.assigned_to = assignee.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Author can only see their own tickets
  if (req.user.role === 'author') {
    query += ' AND t.author_id = ?';
    params.push(req.user.id);
  }

  // Filters for both author or admin
  if (status && status !== 'all') {
    query += ' AND t.status = ?';
    params.push(status);
  }

  if (category && category !== 'all') {
    query += ' AND t.category = ?';
    params.push(category);
  }

  if (priority && priority !== 'all') {
    query += ' AND t.priority = ?';
    params.push(priority);
  }

  if (search) {
    query += ' AND (t.subject LIKE ? OR t.description LIKE ? OR u.name LIKE ? OR b.title LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  // Sorting: By default for admin, highlight Critical/High first and oldest unresolved
  if (sortBy === 'oldest') {
    query += ' ORDER BY t.created_at ASC';
  } else if (sortBy === 'urgency') {
    query += `
      ORDER BY 
        CASE t.priority
          WHEN 'Critical' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
          ELSE 5
        END ASC,
        t.created_at ASC
    `;
  } else {
    query += ' ORDER BY t.created_at DESC';
  }

  const tickets = db.prepare(query).all(...params);

  res.json({ tickets });
}

export async function getTicketById(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;

  const ticket = db.prepare(`
    SELECT 
      t.*,
      u.name as author_name,
      u.email as author_email,
      u.phone as author_phone,
      u.city as author_city,
      b.title as book_title,
      b.isbn as book_isbn,
      b.genre as book_genre,
      b.status as book_status,
      b.mrp as book_mrp,
      b.total_copies_sold as book_total_copies_sold,
      b.total_royalty_earned as book_total_royalty_earned,
      b.royalty_paid as book_royalty_paid,
      b.royalty_pending as book_royalty_pending,
      b.available_on as book_available_on,
      assignee.name as assignee_name
    FROM tickets t
    JOIN users u ON t.author_id = u.id
    LEFT JOIN books b ON t.book_id = b.id
    LEFT JOIN users assignee ON t.assigned_to = assignee.id
    WHERE t.id = ?
  `).get(id) as any;

  if (!ticket) {
    return res.status(404).json({ error: 'NotFound', message: 'Ticket not found' });
  }

  // Author role check: author cannot view tickets of other authors
  if (req.user.role === 'author' && ticket.author_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden', message: 'Access denied to this ticket' });
  }

  // Parse book available_on if present
  if (ticket.book_available_on) {
    ticket.book_available_on = JSON.parse(ticket.book_available_on);
  }

  // Fetch all messages (visible to both author and admin)
  const messages = db.prepare(`
    SELECT tm.*, u.name as sender_name, u.role as sender_role
    FROM ticket_messages tm
    JOIN users u ON tm.sender_id = u.id
    WHERE tm.ticket_id = ?
    ORDER BY tm.created_at ASC
  `).all(id);

  // Fetch internal notes ONLY for admin (Requirement B: not visible to author)
  let notes: any[] = [];
  if (req.user.role === 'admin') {
    notes = db.prepare(`
      SELECT tn.*, u.name as admin_name
      FROM ticket_notes tn
      JOIN users u ON tn.admin_id = u.id
      WHERE tn.ticket_id = ?
      ORDER BY tn.created_at ASC
    `).all(id);
  }

  // Fetch latest AI draft if available
  const latestDraft = db.prepare(`
    SELECT * FROM ai_drafts WHERE ticket_id = ? ORDER BY created_at DESC LIMIT 1
  `).get(id);

  res.json({
    ticket,
    messages,
    notes,
    latestDraft: latestDraft || null
  });
}

export async function createTicket(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { book_id, subject, description, attachment_url, attachment_filename } = req.body;
  const authorId = req.user.id;

  // Verify book belongs to author if book_id is provided
  let bookContext: any = null;
  if (book_id) {
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id) as any;
    if (book) {
      if (req.user.role !== 'admin' && book.author_id !== authorId) {
        return res.status(400).json({ error: 'ValidationError', message: 'Selected book does not belong to your account' });
      }
      bookContext = {
        title: book.title,
        isbn: book.isbn,
        genre: book.genre,
        status: book.status,
        mrp: book.mrp,
        totalCopiesSold: book.total_copies_sold,
        totalRoyaltyEarned: book.total_royalty_earned,
        royaltyPaid: book.royalty_paid,
        royaltyPending: book.royalty_pending,
        lastRoyaltyPayoutDate: book.last_royalty_payout_date,
        printPartner: book.print_partner,
        availableOn: JSON.parse(book.available_on || '[]')
      };
    }
  }

  // 1. AI-Powered Auto-Classification and Priority Scoring
  const classification = await classifyAndPrioritizeTicket(subject, description);

  const ticketId = `TCK-${Math.floor(1000 + Math.random() * 9000)}`;

  db.prepare(`
    INSERT INTO tickets (
      id, author_id, book_id, subject, description, attachment_url, attachment_filename,
      category, ai_category, priority, ai_priority, status, assigned_to
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open', NULL)
  `).run(
    ticketId,
    authorId,
    book_id || null,
    subject,
    description,
    attachment_url || null,
    attachment_filename || null,
    classification.category,
    classification.category,
    classification.priority,
    classification.priority
  );

  // 2. Pre-generate AI draft so it's ready the moment admin opens the ticket
  try {
    const authorName = req.user.name;
    const aiDraft = await generateDraftResponse(
      authorName,
      classification.category,
      subject,
      description,
      bookContext
    );

    db.prepare(`
      INSERT INTO ai_drafts (id, ticket_id, draft_content, model_used, token_count)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      `DFT-${Math.floor(1000 + Math.random() * 9000)}`,
      ticketId,
      aiDraft.draft,
      aiDraft.modelUsed,
      aiDraft.tokenCount
    );
  } catch (err) {
    console.warn('Initial draft generation skipped:', err);
  }

  // Fetch newly created ticket with author & book details
  const createdTicket = db.prepare(`
    SELECT 
      t.*,
      u.name as author_name,
      u.email as author_email,
      b.title as book_title
    FROM tickets t
    JOIN users u ON t.author_id = u.id
    LEFT JOIN books b ON t.book_id = b.id
    WHERE t.id = ?
  `).get(ticketId) as any;

  // Real-time broadcast
  emitTicketCreated(createdTicket);

  res.status(201).json({
    ticket: createdTicket,
    classification
  });
}

export async function updateTicket(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;
  const { status, priority, category, assigned_to } = req.body;

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id) as any;
  if (!ticket) {
    return res.status(404).json({ error: 'NotFound', message: 'Ticket not found' });
  }

  // Authors can only change status to 'Closed' if they resolved their own issue
  if (req.user.role === 'author') {
    if (ticket.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (status && status !== 'Closed') {
      return res.status(403).json({ error: 'Forbidden', message: 'Authors can only close their own tickets' });
    }
  }

  const updates: string[] = [];
  const params: any[] = [];

  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
  }
  if (priority !== undefined && req.user.role === 'admin') {
    updates.push('priority = ?');
    params.push(priority);
  }
  if (category !== undefined && req.user.role === 'admin') {
    updates.push('category = ?');
    params.push(category);
  }
  if (assigned_to !== undefined && req.user.role === 'admin') {
    updates.push('assigned_to = ?');
    params.push(assigned_to);
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    params.push(id);
    db.prepare(`UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const updatedTicket = db.prepare(`
    SELECT 
      t.*,
      u.name as author_name,
      u.email as author_email,
      b.title as book_title,
      assignee.name as assignee_name
    FROM tickets t
    JOIN users u ON t.author_id = u.id
    LEFT JOIN books b ON t.book_id = b.id
    LEFT JOIN users assignee ON t.assigned_to = assignee.id
    WHERE t.id = ?
  `).get(id) as any;

  emitTicketUpdated(updatedTicket);

  res.json({ ticket: updatedTicket });
}

export async function addMessage(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;
  const { message, is_ai_assisted } = req.body;

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id) as any;
  if (!ticket) {
    return res.status(404).json({ error: 'NotFound', message: 'Ticket not found' });
  }

  // Authorization check
  if (req.user.role === 'author' && ticket.author_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const messageId = `MSG-${Math.floor(1000 + Math.random() * 9000)}`;

  db.prepare(`
    INSERT INTO ticket_messages (id, ticket_id, sender_id, sender_role, message, is_ai_assisted)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    messageId,
    id,
    req.user.id,
    req.user.role,
    message,
    is_ai_assisted ? 1 : 0
  );

  // If admin responds and ticket was Open, transition to In Progress automatically
  if (req.user.role === 'admin' && ticket.status === 'Open') {
    db.prepare("UPDATE tickets SET status = 'In Progress', updated_at = datetime('now') WHERE id = ?").run(id);
  } else {
    db.prepare("UPDATE tickets SET updated_at = datetime('now') WHERE id = ?").run(id);
  }

  const createdMessage = db.prepare(`
    SELECT tm.*, u.name as sender_name, u.role as sender_role
    FROM ticket_messages tm
    JOIN users u ON tm.sender_id = u.id
    WHERE tm.id = ?
  `).get(messageId) as any;

  const updatedTicket = db.prepare(`
    SELECT t.*, u.name as author_name, u.email as author_email, b.title as book_title
    FROM tickets t
    JOIN users u ON t.author_id = u.id
    LEFT JOIN books b ON t.book_id = b.id
    WHERE t.id = ?
  `).get(id) as any;

  // Real-time broadcast
  emitMessageCreated(id, createdMessage, ticket.author_id);
  emitTicketUpdated(updatedTicket);

  res.status(201).json({
    message: createdMessage,
    ticket: updatedTicket
  });
}

export async function addNote(req: Request, res: Response) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden', message: 'Internal notes are admin only' });
  }

  const { id } = req.params;
  const { note } = req.body;

  const ticket = db.prepare('SELECT id FROM tickets WHERE id = ?').get(id);
  if (!ticket) {
    return res.status(404).json({ error: 'NotFound', message: 'Ticket not found' });
  }

  const noteId = `NOTE-${Math.floor(1000 + Math.random() * 9000)}`;

  db.prepare(`
    INSERT INTO ticket_notes (id, ticket_id, admin_id, note)
    VALUES (?, ?, ?, ?)
  `).run(noteId, id, req.user.id, note);

  const createdNote = db.prepare(`
    SELECT tn.*, u.name as admin_name
    FROM ticket_notes tn
    JOIN users u ON tn.admin_id = u.id
    WHERE tn.id = ?
  `).get(noteId) as any;

  emitNoteCreated(id, createdNote);

  res.status(201).json({ note: createdNote });
}

export async function generateDraft(req: Request, res: Response) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden', message: 'AI draft generation is restricted to admin agents' });
  }

  const { id } = req.params;
  const ticket = db.prepare(`
    SELECT t.*, u.name as author_name, b.title as book_title, b.isbn as book_isbn,
           b.genre as book_genre, b.status as book_status, b.mrp as book_mrp,
           b.total_copies_sold as book_total_copies_sold,
           b.total_royalty_earned as book_total_royalty_earned,
           b.royalty_paid as book_royalty_paid,
           b.royalty_pending as book_royalty_pending,
           b.last_royalty_payout_date as book_last_payout,
           b.print_partner as book_print_partner,
           b.available_on as book_available_on
    FROM tickets t
    JOIN users u ON t.author_id = u.id
    LEFT JOIN books b ON t.book_id = b.id
    WHERE t.id = ?
  `).get(id) as any;

  if (!ticket) {
    return res.status(404).json({ error: 'NotFound', message: 'Ticket not found' });
  }

  const bookContext = ticket.book_title ? {
    title: ticket.book_title,
    isbn: ticket.book_isbn,
    genre: ticket.book_genre,
    status: ticket.book_status,
    mrp: ticket.book_mrp,
    totalCopiesSold: ticket.book_total_copies_sold,
    totalRoyaltyEarned: ticket.book_total_royalty_earned,
    royaltyPaid: ticket.book_royalty_paid,
    royaltyPending: ticket.book_royalty_pending,
    lastRoyaltyPayoutDate: ticket.book_last_payout,
    printPartner: ticket.book_print_partner,
    availableOn: ticket.book_available_on ? JSON.parse(ticket.book_available_on) : []
  } : undefined;

  const result = await generateDraftResponse(
    ticket.author_name,
    ticket.category,
    ticket.subject,
    ticket.description,
    bookContext
  );

  const draftId = `DFT-${Math.floor(1000 + Math.random() * 9000)}`;

  db.prepare(`
    INSERT INTO ai_drafts (id, ticket_id, draft_content, model_used, token_count)
    VALUES (?, ?, ?, ?, ?)
  `).run(draftId, id, result.draft, result.modelUsed, result.tokenCount);

  res.json({
    draft: {
      id: draftId,
      ticket_id: id,
      draft_content: result.draft,
      model_used: result.modelUsed,
      token_count: result.tokenCount,
      is_fallback: result.isFallback,
      created_at: new Date().toISOString()
    }
  });
}
