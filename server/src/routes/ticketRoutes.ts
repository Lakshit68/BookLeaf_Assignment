import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  addMessage,
  addNote,
  generateDraft
} from '../controllers/ticketController';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  validate,
  createTicketSchema,
  updateTicketSchema,
  createMessageSchema,
  createNoteSchema
} from '../middleware/validation';
import { config } from '../config';

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `attachment-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Allow images, PDFs, text, doc
    const allowed = /jpeg|jpg|png|webp|pdf|doc|docx|txt/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype) || file.mimetype === 'application/pdf';
    if (extname || mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, and documents are supported'));
    }
  }
});

const router = Router();

router.use(requireAuth);

// File Upload endpoint (bonus requirement in Section A: "optional file attachment support")
router.post('/upload', upload.single('attachment'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'ValidationError', message: 'No file uploaded' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    url: fileUrl,
    filename: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

router.get('/', getTickets);
router.get('/:id', getTicketById);
router.post('/', validate(createTicketSchema), createTicket);
router.patch('/:id', validate(updateTicketSchema), updateTicket);
router.post('/:id/messages', validate(createMessageSchema), addMessage);
router.post('/:id/notes', requireAdmin, validate(createNoteSchema), addNote);
router.post('/:id/ai-draft', requireAdmin, generateDraft);

export default router;
