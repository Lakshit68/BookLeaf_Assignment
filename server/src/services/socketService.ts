import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export function initSocketService(httpServer: HTTPServer, allowedOrigin: string) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigin || '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Join room for a specific ticket (e.g. 'ticket:TCK-1001')
    socket.on('join_ticket', (ticketId: string) => {
      socket.join(`ticket:${ticketId}`);
      console.log(`[WebSocket] Client ${socket.id} joined ticket room: ticket:${ticketId}`);
    });

    socket.on('leave_ticket', (ticketId: string) => {
      socket.leave(`ticket:${ticketId}`);
      console.log(`[WebSocket] Client ${socket.id} left ticket room: ticket:${ticketId}`);
    });

    // Join room for a specific author (e.g. 'author:AUTH001')
    socket.on('join_author', (authorId: string) => {
      socket.join(`author:${authorId}`);
      console.log(`[WebSocket] Author ${authorId} joined author room`);
    });

    // Join admin room
    socket.on('join_admin', () => {
      socket.join('admin_channel');
      console.log(`[WebSocket] Admin client ${socket.id} joined admin_channel`);
    });

    socket.on('disconnect', () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitTicketCreated(ticket: any) {
  if (!io) return;
  // Notify admin queue of new incoming ticket
  io.to('admin_channel').emit('ticket:created', ticket);
  // Also notify the author
  io.to(`author:${ticket.author_id}`).emit('ticket:created', ticket);
}

export function emitTicketUpdated(ticket: any) {
  if (!io) return;
  io.to('admin_channel').emit('ticket:updated', ticket);
  io.to(`ticket:${ticket.id}`).emit('ticket:updated', ticket);
  io.to(`author:${ticket.author_id}`).emit('ticket:updated', ticket);
}

export function emitMessageCreated(ticketId: string, message: any, authorId?: string) {
  if (!io) return;
  // Broadcast to anyone in this ticket's room
  io.to(`ticket:${ticketId}`).emit('message:created', message);
  // Broadcast to author's channel so their ticket list badges update
  if (authorId) {
    io.to(`author:${authorId}`).emit('message:created', message);
  }
  // Broadcast to admin channel
  io.to('admin_channel').emit('message:created', message);
}

export function emitNoteCreated(ticketId: string, note: any) {
  if (!io) return;
  // Notes are strictly admin-only
  io.to('admin_channel').emit('note:created', note);
  io.to(`ticket:${ticketId}`).emit('note:created', note);
}
