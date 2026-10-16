import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private connected: boolean = false;
  private listeners: Map<string, Set<Function>> = new Map();

  connect() {
    if (this.socket && this.socket.connected) {
      return;
    }

    // Connect to configured backend URL or same host
    const backendUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') || undefined;
    this.socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('[Socket] Connected to real-time server:', this.socket?.id);
      this.notifyListeners('connection_change', true);
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      console.log('[Socket] Disconnected from server');
      this.notifyListeners('connection_change', false);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      this.connected = false;
      this.notifyListeners('connection_change', false);
    });

    // Real-time domain events
    this.socket.on('ticket:created', (data) => this.notifyListeners('ticket:created', data));
    this.socket.on('ticket:updated', (data) => this.notifyListeners('ticket:updated', data));
    this.socket.on('message:created', (data) => this.notifyListeners('message:created', data));
    this.socket.on('note:created', (data) => this.notifyListeners('note:created', data));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  joinAuthorRoom(authorId: string) {
    if (this.socket) {
      this.socket.emit('join_author', authorId);
    }
  }

  joinAdminRoom() {
    if (this.socket) {
      this.socket.emit('join_admin');
    }
  }

  joinTicketRoom(ticketId: string) {
    if (this.socket) {
      this.socket.emit('join_ticket', ticketId);
    }
  }

  leaveTicketRoom(ticketId: string) {
    if (this.socket) {
      this.socket.emit('leave_ticket', ticketId);
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: Function) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  private notifyListeners(event: string, data: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in socket listener for ${event}:`, err);
        }
      });
    }
  }
}

export const socketService = new SocketService();
