import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { db, initDb } from './index';

export function seedDatabase() {
  initDb();

  // Check if users already seeded
  const checkStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const userRow = checkStmt.get() as { count: number } | undefined;
  const userCount = userRow ? userRow.count : 0;
  if (userCount > 0) {
    console.log(`Database already contains ${userCount} users. Skipping seed.`);
    return;
  }

  console.log('Seeding BookLeaf database with initial data...');

  const sampleDataPath = path.resolve(__dirname, '../../data/bookleaf_sample_data.json');
  const sampleData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));

  const defaultPasswordHash = bcrypt.hashSync('Author@123', 10);
  const adminPasswordHash = bcrypt.hashSync('Admin@123', 10);

  // 1. Insert Ops Admin User
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, phone, city, joined_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(
    'ADMIN001',
    'BookLeaf Ops Lead',
    'admin@bookleaf.com',
    adminPasswordHash,
    'admin',
    '+91-11-4000-8000',
    'Delhi',
    '2022-01-01'
  );

  // 2. Insert Authors and Books
  const insertBook = db.prepare(`
    INSERT INTO books (
      id, author_id, title, isbn, genre, publication_date, status,
      mrp, author_royalty_per_copy, total_copies_sold, total_royalty_earned,
      royalty_paid, royalty_pending, last_royalty_payout_date, print_partner, available_on
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const author of sampleData.authors) {
    insertUser.run(
      author.author_id,
      author.name,
      author.email,
      defaultPasswordHash,
      'author',
      author.phone,
      author.city,
      author.joined_date
    );

    for (const book of author.books) {
      insertBook.run(
        book.book_id,
        author.author_id,
        book.title,
        book.isbn || null,
        book.genre,
        book.publication_date || null,
        book.status,
        book.mrp !== null ? book.mrp : null,
        book.author_royalty_per_copy !== null ? book.author_royalty_per_copy : null,
        book.total_copies_sold || 0,
        book.total_royalty_earned || 0,
        book.royalty_paid || 0,
        book.royalty_pending || 0,
        book.last_royalty_payout_date || null,
        book.print_partner || null,
        JSON.stringify(book.available_on || [])
      );
    }
  }

  // 3. Pre-seed Realistic Sample Tickets
  const insertTicket = db.prepare(`
    INSERT INTO tickets (
      id, author_id, book_id, subject, description, category, ai_category,
      priority, ai_priority, status, assigned_to, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))
  `);

  const insertMsg = db.prepare(`
    INSERT INTO ticket_messages (id, ticket_id, sender_id, sender_role, message, is_ai_assisted, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  const insertNote = db.prepare(`
    INSERT INTO ticket_notes (id, ticket_id, admin_id, note, created_at)
    VALUES (?, ?, ?, ?, datetime('now', ?))
  `);

  // Ticket 1: Priya Sharma (AUTH001) - Royalty Delay
  insertTicket.run(
    'TCK-1001',
    'AUTH001',
    'BK001',
    'Royalty Payment Delay Inquiry',
    'I published my book 4 months ago and still haven’t received any royalty. What’s going on? My dashboard shows ₹3,570 pending.',
    'Royalty & Payments',
    'Royalty & Payments',
    'High',
    'High',
    'Open',
    null,
    '-3 days',
    '-3 days'
  );

  // Ticket 2: Sneha Kulkarni (AUTH007) - Critical ISBN Mismatch
  insertTicket.run(
    'TCK-1002',
    'AUTH007',
    'BK011',
    'ISBN mismatch on Amazon listing',
    'My book is showing a different ISBN on Amazon than what’s on the physical copy. Readers are ordering the wrong edition.',
    'ISBN & Metadata Issues',
    'ISBN & Metadata Issues',
    'Critical',
    'Critical',
    'Open',
    null,
    '-2 days',
    '-2 days'
  );

  // Ticket 3: Farhan Sheikh (AUTH008) - Print Quality Defect
  insertTicket.run(
    'TCK-1003',
    'AUTH008',
    'BK014',
    'Defective author copies received',
    'I received my author copies and the print quality is terrible. The images are blurry and pages are misaligned.',
    'Printing & Quality',
    'Printing & Quality',
    'High',
    'High',
    'In Progress',
    'ADMIN001',
    '-1 days',
    '-6 hours'
  );
  insertNote.run(
    'NOTE-001',
    'TCK-1003',
    'ADMIN001',
    'Investigating batch with Epitome Books printing facility. Need proof photos from author before generating reprint PO.',
    '-6 hours'
  );

  // Ticket 4: Arjun Malhotra (AUTH006) - Stock Sync (Resolved with reply)
  insertTicket.run(
    'TCK-1004',
    'AUTH006',
    'BK010',
    'Book showing currently unavailable on Amazon',
    'My book is published but it’s showing as "Currently Unavailable" on Amazon. Can you check?',
    'Distribution & Availability',
    'Distribution & Availability',
    'Medium',
    'Medium',
    'Resolved',
    'ADMIN001',
    '-5 days',
    '-4 days'
  );
  insertMsg.run(
    'MSG-001',
    'TCK-1004',
    'ADMIN001',
    'admin',
    `Dear Arjun,\n\nThank you for reaching out to us. We understand how concerning it is when your book appears unavailable right after launch.\n\nThis is typically a catalog inventory sync lag between our central warehouse and Amazon's fulfillment network. We have triggered a manual inventory re-sync with Amazon's distribution team. The listing will reflect in-stock status within 24–48 hours.\n\nWe will monitor the listing closely. Please let us know if you have any questions in the meantime!\n\nWarm regards,\nBookLeaf Author Support Team`,
    1,
    '-4 days'
  );

  // Ticket 5: Kavita Deshmukh (AUTH009) - Production delay
  insertTicket.run(
    'TCK-1005',
    'AUTH009',
    'BK015',
    'Typesetting progress update',
    'It’s been 3 weeks and my book is still in typesetting. When will it be done?',
    'Book Status & Production Updates',
    'Book Status & Production Updates',
    'Medium',
    'Medium',
    'Open',
    null,
    '-18 hours',
    '-18 hours'
  );

  console.log('Database seeded successfully with 10 authors, 18 books, 1 admin, and 5 sample tickets!');
}

if (require.main === module) {
  seedDatabase();
}
