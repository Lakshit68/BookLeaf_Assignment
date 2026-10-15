export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'BookLeaf Publishing - Author Support & Communication Portal API',
    version: '1.0.0',
    description: 'RESTful API documentation for BookLeaf Publishing Author Support & Communication Portal, featuring AI-assisted ticket classification, priority scoring, smart knowledge base response drafting, and real-time WebSockets.'
  },
  servers: [
    {
      url: 'http://localhost:5001/api',
      description: 'Local Development Server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token obtained from /auth/login'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'AUTH001' },
          name: { type: 'string', example: 'Priya Sharma' },
          email: { type: 'string', example: 'priya.sharma@email.com' },
          role: { type: 'string', enum: ['author', 'admin'], example: 'author' },
          phone: { type: 'string', example: '+91-98765-43210' },
          city: { type: 'string', example: 'Mumbai' },
          joined_date: { type: 'string', example: '2023-03-15' }
        }
      },
      Book: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'BK001' },
          title: { type: 'string', example: 'Whispers of the Ganges' },
          isbn: { type: 'string', example: '978-93-5XXXX-01-1' },
          genre: { type: 'string', example: 'Literary Fiction' },
          publication_date: { type: 'string', nullable: true, example: '2023-06-20' },
          status: { type: 'string', example: 'Published & Live' },
          mrp: { type: 'number', nullable: true, example: 399 },
          author_royalty_per_copy: { type: 'number', nullable: true, example: 35 },
          total_copies_sold: { type: 'integer', example: 342 },
          total_royalty_earned: { type: 'number', example: 11970 },
          royalty_paid: { type: 'number', example: 8400 },
          royalty_pending: { type: 'number', example: 3570 },
          last_royalty_payout_date: { type: 'string', nullable: true, example: '2025-10-15' },
          print_partner: { type: 'string', nullable: true, example: 'In-House' },
          available_on: {
            type: 'array',
            items: { type: 'string' },
            example: ['Amazon India', 'Flipkart', 'BookLeaf Store']
          }
        }
      },
      Ticket: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'TCK-1001' },
          author_id: { type: 'string', example: 'AUTH001' },
          book_id: { type: 'string', nullable: true, example: 'BK001' },
          subject: { type: 'string', example: 'Royalty Payment Delay Inquiry' },
          description: { type: 'string', example: 'I published my book 4 months ago and still haven’t received any royalty.' },
          category: {
            type: 'string',
            enum: [
              'Royalty & Payments',
              'ISBN & Metadata Issues',
              'Printing & Quality',
              'Distribution & Availability',
              'Book Status & Production Updates',
              'General Inquiry'
            ],
            example: 'Royalty & Payments'
          },
          ai_category: { type: 'string', example: 'Royalty & Payments' },
          priority: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'], example: 'High' },
          ai_priority: { type: 'string', example: 'High' },
          status: { type: 'string', enum: ['Open', 'In Progress', 'Resolved', 'Closed'], example: 'Open' },
          assigned_to: { type: 'string', nullable: true, example: 'ADMIN001' },
          created_at: { type: 'string', example: '2026-10-12T10:00:00Z' },
          updated_at: { type: 'string', example: '2026-10-12T10:00:00Z' }
        }
      },
      TicketMessage: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'MSG-1001' },
          ticket_id: { type: 'string', example: 'TCK-1001' },
          sender_id: { type: 'string', example: 'ADMIN001' },
          sender_role: { type: 'string', enum: ['author', 'admin'], example: 'admin' },
          message: { type: 'string', example: 'Dear Priya, thank you for reaching out...' },
          is_ai_assisted: { type: 'integer', example: 1 },
          created_at: { type: 'string', example: '2026-10-12T11:00:00Z' }
        }
      },
      TicketNote: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'NOTE-001' },
          ticket_id: { type: 'string', example: 'TCK-1001' },
          admin_id: { type: 'string', example: 'ADMIN001' },
          note: { type: 'string', example: 'Bank IFSC verified with HDFC branch.' },
          created_at: { type: 'string', example: '2026-10-12T10:30:00Z' }
        }
      }
    }
  },
  paths: {
    '/auth/login': {
      post: {
        summary: 'Authenticate User (Author or Admin)',
        description: 'Authenticates user with email and password and returns a signed JWT token.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'priya.sharma@email.com' },
                  password: { type: 'string', example: 'Author@123' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Authentication successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          },
          401: { description: 'Invalid email or password' }
        }
      }
    },
    '/auth/me': {
      get: {
        summary: 'Get Current Authenticated User Profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Authenticated user profile' },
          401: { description: 'Unauthorized' }
        }
      }
    },
    '/auth/demo-users': {
      get: {
        summary: 'Get Demo Author & Admin Users for Quick Testing',
        description: 'Returns pre-seeded authors and admin accounts with passwords for instant 1-click evaluation.',
        responses: {
          200: { description: 'List of demo users' }
        }
      }
    },
    '/books/my-books': {
      get: {
        summary: 'Get Published & In-Production Books with Royalty Stats',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'List of books and aggregated royalty calculations',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    books: { type: 'array', items: { $ref: '#/components/schemas/Book' } },
                    summary: {
                      type: 'object',
                      properties: {
                        totalBooks: { type: 'integer' },
                        publishedBooks: { type: 'integer' },
                        inProductionBooks: { type: 'integer' },
                        totalCopiesSold: { type: 'integer' },
                        totalRoyaltyEarned: { type: 'number' },
                        totalRoyaltyPaid: { type: 'number' },
                        totalRoyaltyPending: { type: 'number' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/tickets': {
      get: {
        summary: 'List Tickets (Filtered by Author RBAC or Admin Queue)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['all', 'Open', 'In Progress', 'Resolved', 'Closed'] } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['all', 'Critical', 'High', 'Medium', 'Low'] } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['latest', 'oldest', 'urgency'] } }
        ],
        responses: {
          200: {
            description: 'Array of tickets matching filters',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    tickets: { type: 'array', items: { $ref: '#/components/schemas/Ticket' } }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        summary: 'Submit a New Support Query (Triggers AI Classification & Priority)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['subject', 'description'],
                properties: {
                  book_id: { type: 'string', nullable: true, example: 'BK001' },
                  subject: { type: 'string', example: 'Missing royalty payout for Q3' },
                  description: { type: 'string', example: 'I published my book 4 months ago and have not received royalty payment.' },
                  attachment_url: { type: 'string', nullable: true },
                  attachment_filename: { type: 'string', nullable: true }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Ticket created with AI classification and initial draft' },
          400: { description: 'Validation error' }
        }
      }
    },
    '/tickets/{id}': {
      get: {
        summary: 'Get Ticket Details by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Ticket details, chat history, and internal notes (if admin)' },
          403: { description: 'Forbidden (authors cannot view tickets of others)' },
          404: { description: 'Ticket not found' }
        }
      },
      patch: {
        summary: 'Update Ticket (Status, Priority Override, Category Override, Assignee)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['Open', 'In Progress', 'Resolved', 'Closed'] },
                  priority: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
                  category: { type: 'string' },
                  assigned_to: { type: 'string', nullable: true }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Ticket updated successfully' }
        }
      }
    },
    '/tickets/{id}/messages': {
      post: {
        summary: 'Send a Message / Reply to Ticket Thread',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['message'],
                properties: {
                  message: { type: 'string', example: 'Thank you for looking into this!' },
                  is_ai_assisted: { type: 'boolean', example: false }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Message sent and broadcast via WebSockets' }
        }
      }
    },
    '/tickets/{id}/notes': {
      post: {
        summary: 'Add Internal Admin Note (Not Visible to Author)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['note'],
                properties: {
                  note: { type: 'string', example: 'Contacted Repro printing manager for batch reprint order.' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Internal note added successfully' },
          403: { description: 'Forbidden (Admins only)' }
        }
      }
    },
    '/tickets/{id}/ai-draft': {
      post: {
        summary: 'Generate or Regenerate AI Draft Response (Admin Only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'AI-drafted response with token stats and model source',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    draft: {
                      type: 'object',
                      properties: {
                        draft_content: { type: 'string' },
                        model_used: { type: 'string' },
                        token_count: { type: 'integer' },
                        is_fallback: { type: 'boolean' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/tickets/upload': {
      post: {
        summary: 'Upload Attachment File for Ticket Query',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  attachment: { type: 'string', format: 'binary' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'File uploaded successfully' }
        }
      }
    },
    '/admin/stats': {
      get: {
        summary: 'Get Admin Queue Metrics, Critical Counts, and Oldest Unresolved',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Admin dashboard queue statistics' },
          403: { description: 'Forbidden (Admins only)' }
        }
      }
    }
  }
};
