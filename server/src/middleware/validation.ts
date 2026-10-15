import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid input data provided',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      return res.status(400).json({ error: 'Validation Error', message: 'Failed to parse request payload' });
    }
  };
}

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

export const createTicketSchema = z.object({
  book_id: z.string().nullable().optional(),
  subject: z.string().min(3, 'Subject must be at least 3 characters long').max(250, 'Subject is too long'),
  description: z.string().min(10, 'Description must be at least 10 characters long to provide sufficient detail'),
  attachment_url: z.string().nullable().optional(),
  attachment_filename: z.string().nullable().optional()
});

export const updateTicketSchema = z.object({
  status: z.enum(['Open', 'In Progress', 'Resolved', 'Closed']).optional(),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']).optional(),
  category: z.enum([
    'Royalty & Payments',
    'ISBN & Metadata Issues',
    'Printing & Quality',
    'Distribution & Availability',
    'Book Status & Production Updates',
    'General Inquiry'
  ]).optional(),
  assigned_to: z.string().nullable().optional()
});

export const createMessageSchema = z.object({
  message: z.string().min(2, 'Message cannot be empty'),
  is_ai_assisted: z.boolean().optional()
});

export const createNoteSchema = z.object({
  note: z.string().min(2, 'Internal note cannot be empty')
});
