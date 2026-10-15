import { Request, Response } from 'express';
import { db } from '../db';

export function getMyBooks(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // If author, force user.id. If admin, allow passing author_id query param
  let authorId = req.user.id;
  if (req.user.role === 'admin' && req.query.author_id) {
    authorId = String(req.query.author_id);
  }

  const books = db.prepare(`
    SELECT * FROM books WHERE author_id = ? ORDER BY publication_date DESC, created_at DESC
  `).all(authorId).map((book: any) => ({
    ...book,
    available_on: JSON.parse(book.available_on || '[]')
  }));

  // Calculate summary metrics
  const summary = books.reduce((acc: any, b: any) => {
    acc.totalBooks += 1;
    if (b.status === 'Published & Live') {
      acc.publishedBooks += 1;
    } else {
      acc.inProductionBooks += 1;
    }
    acc.totalCopiesSold += (b.total_copies_sold || 0);
    acc.totalRoyaltyEarned += (b.total_royalty_earned || 0);
    acc.totalRoyaltyPaid += (b.royalty_paid || 0);
    acc.totalRoyaltyPending += (b.royalty_pending || 0);
    return acc;
  }, {
    totalBooks: 0,
    publishedBooks: 0,
    inProductionBooks: 0,
    totalCopiesSold: 0,
    totalRoyaltyEarned: 0,
    totalRoyaltyPaid: 0,
    totalRoyaltyPending: 0
  });

  res.json({
    books,
    summary
  });
}

export function getBookById(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id) as any;

  if (!book) {
    return res.status(404).json({ error: 'NotFound', message: 'Book not found' });
  }

  // Author can only see their own book
  if (req.user.role !== 'admin' && book.author_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden', message: 'Access denied to this book' });
  }

  res.json({
    book: {
      ...book,
      available_on: JSON.parse(book.available_on || '[]')
    }
  });
}

export function getAllBooks(req: Request, res: Response) {
  const books = db.prepare(`
    SELECT b.*, u.name as author_name, u.email as author_email
    FROM books b
    JOIN users u ON b.author_id = u.id
    ORDER BY b.created_at DESC
  `).all().map((book: any) => ({
    ...book,
    available_on: JSON.parse(book.available_on || '[]')
  }));

  res.json({ books });
}
