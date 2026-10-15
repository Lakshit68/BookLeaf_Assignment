import { User, Book, BooksSummary, Ticket, TicketMessage, TicketNote, AiDraft, AdminStats, StaffMember } from '../types';

const API_BASE = '/api';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('bookleaf_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('bookleaf_token', token);
    } else {
      localStorage.removeItem('bookleaf_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status} Error`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // fallback
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Auth Endpoints
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const data = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(data.token);
    return data;
  }

  async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me');
  }

  async getDemoUsers(): Promise<{ users: any[]; defaultPasswords: Record<string, string> }> {
    return this.request('/auth/demo-users');
  }

  // Books Endpoints
  async getMyBooks(authorId?: string): Promise<{ books: Book[]; summary: BooksSummary }> {
    const query = authorId ? `?author_id=${authorId}` : '';
    return this.request<{ books: Book[]; summary: BooksSummary }>(`/books/my-books${query}`);
  }

  // Tickets Endpoints
  async getTickets(params: {
    status?: string;
    category?: string;
    priority?: string;
    search?: string;
    sortBy?: string;
  } = {}): Promise<{ tickets: Ticket[] }> {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set('status', params.status);
    if (params.category) searchParams.set('category', params.category);
    if (params.priority) searchParams.set('priority', params.priority);
    if (params.search) searchParams.set('search', params.search);
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);

    const qs = searchParams.toString();
    return this.request<{ tickets: Ticket[] }>(`/tickets${qs ? `?${qs}` : ''}`);
  }

  async getTicketById(id: string): Promise<{
    ticket: Ticket;
    messages: TicketMessage[];
    notes: TicketNote[];
    latestDraft: AiDraft | null;
  }> {
    return this.request(`/tickets/${id}`);
  }

  async createTicket(payload: {
    book_id?: string | null;
    subject: string;
    description: string;
    attachment_url?: string | null;
    attachment_filename?: string | null;
  }): Promise<{ ticket: Ticket; classification: any }> {
    return this.request('/tickets', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateTicket(
    id: string,
    updates: {
      status?: string;
      priority?: string;
      category?: string;
      assigned_to?: string | null;
    }
  ): Promise<{ ticket: Ticket }> {
    return this.request(`/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  async addMessage(
    ticketId: string,
    message: string,
    isAiAssisted: boolean = false
  ): Promise<{ message: TicketMessage; ticket: Ticket }> {
    return this.request(`/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message, is_ai_assisted: isAiAssisted })
    });
  }

  async addNote(ticketId: string, note: string): Promise<{ note: TicketNote }> {
    return this.request(`/tickets/${ticketId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note })
    });
  }

  async generateAiDraft(ticketId: string): Promise<{ draft: AiDraft }> {
    return this.request(`/tickets/${ticketId}/ai-draft`, {
      method: 'POST'
    });
  }

  async uploadAttachment(file: File): Promise<{ url: string; filename: string; size: number }> {
    const formData = new FormData();
    formData.append('attachment', file);
    return this.request('/tickets/upload', {
      method: 'POST',
      body: formData
    });
  }

  // Admin Endpoints
  async getAdminStats(): Promise<AdminStats> {
    return this.request<AdminStats>('/admin/stats');
  }

  async getStaff(): Promise<{ staff: StaffMember[] }> {
    return this.request<{ staff: StaffMember[] }>('/admin/staff');
  }

  // AI status
  async getAiStatus(): Promise<any> {
    return this.request('/ai/status');
  }
}

export const api = new ApiService();
