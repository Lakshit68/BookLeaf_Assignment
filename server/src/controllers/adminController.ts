import { Request, Response } from 'express';
import { db } from '../db';

export function getAdminStats(req: Request, res: Response) {
  const totalTickets = (db.prepare('SELECT COUNT(*) as count FROM tickets').get() as any).count;
  const openTickets = (db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'Open'").get() as any).count;
  const inProgressTickets = (db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'In Progress'").get() as any).count;
  const resolvedTickets = (db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'Resolved'").get() as any).count;
  const closedTickets = (db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'Closed'").get() as any).count;

  const criticalTickets = (db.prepare("SELECT COUNT(*) as count FROM tickets WHERE priority = 'Critical' AND status NOT IN ('Resolved', 'Closed')").get() as any).count;
  const highTickets = (db.prepare("SELECT COUNT(*) as count FROM tickets WHERE priority = 'High' AND status NOT IN ('Resolved', 'Closed')").get() as any).count;

  // Oldest unresolved ticket
  const oldestUnresolved = db.prepare(`
    SELECT t.id, t.subject, t.priority, t.created_at, u.name as author_name,
      ROUND((julianday('now') - julianday(t.created_at)) * 24, 1) as age_hours
    FROM tickets t
    JOIN users u ON t.author_id = u.id
    WHERE t.status IN ('Open', 'In Progress')
    ORDER BY t.created_at ASC
    LIMIT 1
  `).get() as any;

  // Category breakdown
  const categoryBreakdown = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM tickets
    GROUP BY category
    ORDER BY count DESC
  `).all();

  // Total authors & books
  const totalAuthors = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'author'").get() as any).count;
  const totalBooks = (db.prepare('SELECT COUNT(*) as count FROM books').get() as any).count;

  res.json({
    metrics: {
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      criticalTickets,
      highTickets,
      totalAuthors,
      totalBooks
    },
    oldestUnresolved: oldestUnresolved || null,
    categoryBreakdown
  });
}

export function getStaff(req: Request, res: Response) {
  const staff = db.prepare(`
    SELECT id, name, email, role,
      (SELECT COUNT(*) FROM tickets WHERE assigned_to = users.id AND status IN ('Open', 'In Progress')) as active_tickets
    FROM users
    WHERE role = 'admin'
    ORDER BY name ASC
  `).all();

  res.json({ staff });
}
