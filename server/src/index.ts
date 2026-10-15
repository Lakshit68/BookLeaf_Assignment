import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { initDb } from './db';
import { seedDatabase } from './db/seed';
import { initSocketService } from './services/socketService';
import { errorHandler } from './middleware/errorHandler';
import { openApiSpec } from './swagger/swaggerDoc';

import authRoutes from './routes/authRoutes';
import bookRoutes from './routes/bookRoutes';
import ticketRoutes from './routes/ticketRoutes';
import adminRoutes from './routes/adminRoutes';
import aiRoutes from './routes/aiRoutes';

// Initialize SQLite database and seed initial data if needed
initDb();
seedDatabase();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocketService(server, config.clientUrl);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow local dev origins and requests with no origin (like mobile/curl)
    callback(null, true);
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static serving for uploaded files
app.use('/uploads', express.static(config.uploadDir));

// Interactive Swagger / OpenAPI Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  customSiteTitle: 'BookLeaf API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    persistAuthorization: true
  }
}));

// Direct JSON OpenAPI spec route
app.get('/api/docs.json', (req, res) => {
  res.json(openApiSpec);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'BookLeaf Author Support Portal API',
    aiEngine: config.ai.provider
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Start server
server.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`🚀 BookLeaf Support API Server running on port ${config.port}`);
  console.log(`📖 Interactive API Docs: http://localhost:${config.port}/api/docs`);
  console.log(`🌐 Real-time WebSockets: Active (Socket.io)`);
  console.log(`🤖 AI Provider: ${config.ai.provider.toUpperCase()}`);
  console.log(`====================================================`);
});

export { app, server };
