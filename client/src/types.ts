export interface User {
  id: string;
  name: string;
  email: string;
  role: 'author' | 'admin';
  phone?: string;
  city?: string;
  joined_date?: string;
}

export interface Book {
  id: string;
  author_id: string;
  title: string;
  isbn: string | null;
  genre: string;
  publication_date: string | null;
  status: string;
  mrp: number | null;
  author_royalty_per_copy: number | null;
  total_copies_sold: number;
  total_royalty_earned: number;
  royalty_paid: number;
  royalty_pending: number;
  last_royalty_payout_date: string | null;
  print_partner: string | null;
  available_on: string[];
}

export interface BooksSummary {
  totalBooks: number;
  publishedBooks: number;
  inProductionBooks: number;
  totalCopiesSold: number;
  totalRoyaltyEarned: number;
  totalRoyaltyPaid: number;
  totalRoyaltyPending: number;
}

export type TicketCategory =
  | 'Royalty & Payments'
  | 'ISBN & Metadata Issues'
  | 'Printing & Quality'
  | 'Distribution & Availability'
  | 'Book Status & Production Updates'
  | 'General Inquiry';

export type TicketPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export interface Ticket {
  id: string;
  author_id: string;
  book_id: string | null;
  subject: string;
  description: string;
  attachment_url: string | null;
  attachment_filename: string | null;
  category: TicketCategory;
  ai_category: TicketCategory;
  priority: TicketPriority;
  ai_priority: TicketPriority;
  status: TicketStatus;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_email?: string;
  author_phone?: string;
  author_city?: string;
  book_title?: string;
  book_isbn?: string;
  book_genre?: string;
  book_status?: string;
  book_mrp?: number | null;
  book_total_copies_sold?: number;
  book_total_royalty_earned?: number;
  book_royalty_paid?: number;
  book_royalty_pending?: number;
  book_available_on?: string[];
  assignee_name?: string;
  message_count?: number;
  note_count?: number;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_name?: string;
  sender_role: 'author' | 'admin';
  message: string;
  is_ai_assisted: number;
  created_at: string;
}

export interface TicketNote {
  id: string;
  ticket_id: string;
  admin_id: string;
  admin_name?: string;
  note: string;
  created_at: string;
}

export interface AiDraft {
  id: string;
  ticket_id: string;
  draft_content: string;
  model_used: string;
  token_count: number;
  is_fallback?: boolean;
  created_at: string;
}

export interface AdminStats {
  metrics: {
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    resolvedTickets: number;
    closedTickets: number;
    criticalTickets: number;
    highTickets: number;
    totalAuthors: number;
    totalBooks: number;
  };
  oldestUnresolved: {
    id: string;
    subject: string;
    priority: TicketPriority;
    created_at: string;
    author_name: string;
    age_hours: number;
  } | null;
  categoryBreakdown: { category: string; count: number }[];
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  active_tickets: number;
}
