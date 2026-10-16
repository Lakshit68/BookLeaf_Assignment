# BookLeaf Publishing — Author Support & Communication Portal

An intelligent, full-stack Author Support & Communication Portal built for **BookLeaf Publishing** to streamline author communication across a catalog of 22,000+ titles and 1,200+ monthly releases. 

Powered by **AI-assisted ticket classification**, **automatic priority scoring**, **selective Knowledge Base context retrieval**, and **real-time bi-directional messaging via WebSockets**.

---

##  Table of Contents
1. [Key Features](#-key-features)
2. [Architecture & System Design](#-architecture--system-design)
3. [Technology Stack](#-technology-stack)
4. [AI Integration Architecture](#-ai-integration-architecture)
5. [Pre-Seeded Test Credentials](#-pre-seeded-test-credentials)
6. [Quick Start & Setup Guide](#-quick-start--setup-guide)
7. [REST API Documentation](#-rest-api-documentation)
8. [Automated Test Suite](#-automated-test-suite)
9. [Trade-Offs & Production Evolution](#-trade-offs--production-evolution)

---

##  Key Features

### 1. Author-Facing Portal
- **Email/Password Authentication**: Secure JWT-based authentication with strict data isolation.
- **My Books Dashboard**:
  - Live display of published titles with ISBN, MRP, publication date, total copies sold, royalty split, royalty paid, and pending payouts.
  - Graceful handling of books in production pipelines (e.g., *In Production - Cover Design*, *In Production - Typesetting*) with null MRP/dates.
  - Aggregated author earnings summary with ₹1,000 minimum payout threshold indicator.
- **Submit a Support Query**:
  - Contextual book dropdown (*Specific Book* or *General / Account Level*).
  - Subject and description input with client- and server-side validation.
  - File attachment support (images, PDFs, documents up to 10MB) for print defect photos or royalty statements.
- **My Tickets & Real-Time Thread**:
  - Displays submitted tickets with live status badges (`Open`, `In Progress`, `Resolved`, `Closed`).
  - Interactive conversation thread modal with real-time WebSocket updates — admin responses appear instantly without refreshing.
  - Author follow-up reply input and self-service ticket resolution.

### 2. Admin-Facing Portal (BookLeaf Operations Team)
- **Ticket Queue with Urgency Alerts**:
  - Centralized queue of all incoming tickets across all authors.
  - Multi-facet filtering by `Status`, `Category`, `Priority`, and keyword search.
  - Visual **Oldest Unresolved Ticket Flag** tracking SLA wait times in hours.
  - Sorting options: *Urgency (Critical First)*, *Oldest Unresolved*, or *Latest Created*.
- **AI-Powered Auto-Classification**:
  - Automatically classifies queries into 6 categories:
    1. `Royalty & Payments`
    2. `ISBN & Metadata Issues`
    3. `Printing & Quality`
    4. `Distribution & Availability`
    5. `Book Status & Production Updates`
    6. `General Inquiry`
  - Admin override capability with audit history.
- **AI-Generated Priority Score**:
  - Assigns `Critical`, `High`, `Medium`, or `Low` priority based on operational severity (e.g., ISBN mismatches and 4-month royalty delays flagged as Critical/High).
  - Admin override capability.
- **AI-Drafted Knowledge Base Response**:
  - On ticket open/click, the system generates a draft response grounded in the official BookLeaf Knowledge Base and author's book data.
  - Displays token count consumption and model source.
  - 1-click **"Copy Draft to Editor"** allowing the agent to edit before sending.
  - "Regenerate Draft" button for alternative formulation.
- **Ticket Management & Internal Notes**:
  - Status updates (`Open` → `In Progress` → `Resolved` → `Closed`).
  - Staff assignment dropdown with active workload indicators.
  - **Internal Admin Notes**: Private notes tab marked with a lock icon, completely hidden from the author.

---

##  Architecture & System Design

```
                     ┌────────────────────────────────────────┐
                     │          React + Vite Frontend         │
                     │  (Author Portal & Admin Ops Portal)    │
                     └──────────────────┬─────────────────────┘
                                        │
                         HTTP REST API  │  WebSockets (Socket.io)
                                        │
                     ┌──────────────────▼─────────────────────┐
                     │          Node.js Express API           │
                     │       Authentication & RBAC Guard      │
                     └──────┬─────────────┬────────────┬──────┘
                            │             │            │
            ┌───────────────▼┐     ┌──────▼──────┐   ┌─▼─────────────────┐
            │ SQLite Database │     │   AI Engine │   │   File Storage    │
            │  (WAL Enabled)  │     │  (OpenAI/   │   │   (Local Uploads  │
            │ Users, Books,   │     │  Gemini/    │   │   /uploads)       │
            │ Tickets, Notes  │     │  Fallback)  │   └───────────────────┘
            └────────────────┘     └─────────────┘
```

### Clean Architecture Decisions
1. **Separation of Concerns**:
   - `server/src/db/`: Database initialization, schema tables, indexes, and initial data seeding.
   - `server/src/middleware/`: Auth verification, role-based access control (RBAC), and Zod request validation.
   - `server/src/services/`: Modular AI service, token-optimized Knowledge Base chunk retriever, and WebSocket real-time broadcaster.
   - `server/src/controllers/`: Business logic for tickets, books, and ops queue.
   - `server/src/routes/`: REST endpoint definitions with OpenAPI/Swagger bindings.
2. **Data Isolation (RBAC)**:
   - Authors can only query books and tickets associated with their own `author_id`.
   - Admin routes (`/api/admin/*`, `/api/tickets/:id/notes`, AI draft generation) are protected by `requireAdmin` middleware.
3. **Database Performance**:
   - SQLite configured with Write-Ahead Logging (`WAL` mode) and explicit foreign key constraints.
   - Indexes on `author_id`, `status`, `priority`, `created_at`, and foreign keys.

---

##  Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React 19 + TypeScript + Vite | Blazing fast build times, reactive state management, type safety |
| **Styling** | Vanilla CSS Design System | Custom dark slate palette, glassmorphism, responsive grid, zero external CSS bloat |
| **Icons** | Lucide React | Lightweight, consistent iconography |
| **Backend** | Node.js (v20) + Express + TypeScript | Lightweight, high throughput, mature ecosystem |
| **Database** | SQLite via `better-sqlite3` | Zero-configuration, file-backed, ACID compliant, portable |
| **Real-Time** | Socket.io | Instant bi-directional event emission with automatic fallback |
| **Validation**| Zod | Strict schema validation with informative, human-readable error messages |
| **API Docs**  | Swagger UI Express + OpenAPI 3.0 | Interactive API documentation at `/api/docs` |
| **File Upload**| Multer | Secure disk storage with file type and size filtering (10MB) |

---

##  AI Integration Architecture

### 1. Prompt Engineering & Tone Calibration
BookLeaf communication tone guidelines are directly integrated into system instructions:
- **Partnership Stance**: Authors are creative partners, not support tickets.
- **Empathy First**: Validate the author's frustration before jumping into policy details.
- **Direct Accountability**: If BookLeaf is at fault (e.g., delayed royalties, ISBN discrepancies, defective author copies), own it directly without corporate deflection.
- **Specifics Over Platitudes**: Quote exact numbers (e.g., `₹3,570 pending`, `342 copies sold`, `80/20 split formula`).
- **Concrete Timelines**: Provide resolution commitments (e.g., *within 48 hours*, *5–7 business days for reprints*).

### 2. Cost Awareness & Token Optimization (Requirement D.4)
Rather than dumping the entire Knowledge Base into every API call:
- The Knowledge Base is modularized into distinct chunks (`OVERVIEW`, `ROYALTY`, `ISBN`, `PRINTING`, `DISTRIBUTION`, `PRODUCTION`, `TONE_GUIDELINES`).
- The **`getRelevantKbContext()`** selector inspects the query category and intent keywords, dynamically injecting **only the necessary chunks**.
- System and user prompts are bounded with strict `max_tokens: 600`, reducing token costs by **over 65%** compared to naive implementations.

### 3. Multi-Provider & Graceful Degradation (Requirement D.3 & D.5)
The AI system supports:
1. **OpenAI** (`gpt-4o-mini` default, configurable via `OPENAI_API_KEY`)
2. **Google Gemini** (`gemini-1.5-flash` default, configurable via `GEMINI_API_KEY`)
3. **Anthropic** (`claude-3-5-haiku-20241022`, configurable via `ANTHROPIC_API_KEY`)
4. **Intelligent Fallback Engine (Zero External Failure)**:
   - If no API key is provided, or if the external API experiences rate-limiting/outages, the system immediately uses the built-in deterministic Knowledge Base pattern matcher.
   - Classification, priority scoring, and draft response generation **never crash or return generic 500 errors**.

---

##  Pre-Seeded Test Credentials

The database is pre-seeded with all **10 authors and 18 books** from `bookleaf_sample_data.json` alongside 5 realistic sample tickets.

| Account Type | Name / Focus Area | Email | Password | Notable Data Points |
|---|---|---|---|---|
| **Admin** | **BookLeaf Ops Lead** | `admin@bookleaf.com` | `Admin@123` | Full queue access, internal notes, AI draft generation |
| **Author** | **Priya Sharma** | `priya.sharma@email.com` | `Author@123` | 2 books (*Whispers of the Ganges*, *The Saffron Diaries*), ₹3,570 pending royalty, Ticket `TCK-1001` |
| **Author** | **Sneha Kulkarni** | `sneha.kulkarni@email.com` | `Author@123` | 3 books, including *Midnight in Mysore* (**In Production - Cover Design**), Ticket `TCK-1002` |
| **Author** | **Farhan Sheikh** | `farhan.sheikh@email.com` | `Author@123` | 1 book (*Ghazal of the Forgotten*), Ticket `TCK-1003` for print quality defect |
| **Author** | **Arjun Malhotra** | `arjun.malhotra@email.com` | `Author@123` | 1 book (*Turban Tales*), Ticket `TCK-1004` (Resolved with admin response) |
| **Author** | **Kavita Deshmukh** | `kavita.deshmukh@email.com` | `Author@123` | 2 books, including *Raising Roots* (**In Production - Typesetting**) and *The Nagpur Notebooks* (₹850 below rollover threshold) |

> 💡 **Tip**: You can use the **"Switch Demo User"** button in the top navigation bar to switch between accounts in 1 click!

---

##  Quick Start & Setup Guide

### Prerequisites
- Node.js >= 18 (Tested on v20.20.0)
- npm >= 9

### Step 1: Clone and Install
```bash
# In the project root directory:
npm run install:all
```

### Step 2: Configure Environment (Optional)
A pre-configured `.env` file is ready in `server/.env`. If you wish to use live OpenAI or Gemini API keys, edit `server/.env`:
```env
AI_PROVIDER=fallback # Set to 'openai' or 'gemini' or leave as 'fallback'
OPENAI_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
```

### Step 3: Seed Database
```bash
npm run seed
```

### Step 4: Run Application
```bash
# Runs both backend (port 5001) and frontend (port 5173) concurrently:
npm run dev
```

Open your browser at:
- **Web Application**: [http://localhost:5173](http://localhost:5173)
- **Interactive Swagger API Docs**: [http://localhost:5001/api/docs](http://localhost:5001/api/docs)

---

##  REST API Documentation

Full interactive OpenAPI 3.0 documentation is hosted live at `/api/docs`.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticate with email/password; returns JWT token |
| `GET` | `/api/auth/me` | Authenticated | Get current authenticated user profile |
| `GET` | `/api/auth/demo-users` | Public | Get list of demo authors and admin for instant testing |
| `GET` | `/api/books/my-books` | Author/Admin | Get published & in-production books with aggregated royalty statistics |
| `GET` | `/api/books/:id` | Author/Admin | Get single book details (enforces author ownership) |
| `GET` | `/api/tickets` | Author/Admin | List tickets (filtered to author's own; admin sees full queue with status/category/priority/search/sort filters) |
| `GET` | `/api/tickets/:id` | Author/Admin | Get ticket details, original query, and message thread (admin also sees private internal notes) |
| `POST` | `/api/tickets` | Author | Submit support query; triggers automatic AI classification and priority scoring |
| `PATCH` | `/api/tickets/:id` | Author/Admin | Update status (author can close; admin can override category, priority, status, assignee) |
| `POST` | `/api/tickets/:id/messages` | Author/Admin | Post reply to ticket thread; broadcasts via WebSocket in real time |
| `POST` | `/api/tickets/:id/notes` | Admin Only | Add private internal note (invisible to author) |
| `POST` | `/api/tickets/:id/ai-draft` | Admin Only | Generate or regenerate AI draft response using BookLeaf KB context |
| `POST` | `/api/tickets/upload` | Authenticated | Upload file attachment (returns URL and metadata) |
| `GET` | `/api/admin/stats` | Admin Only | Queue analytics: open, critical, resolved, and oldest unresolved ticket age |
| `GET` | `/api/admin/staff` | Admin Only | List of operations team members with active ticket workloads |

---

##  Automated Test Suite

A comprehensive test suite verifies data integrity, RBAC isolation, AI classification accuracy, token optimization, and edge case handling:

```bash
npm --prefix server run test
```

### Tests Covered:
- **Database Seed Integrity**: Verifies 10 authors, 18 books, 1 admin user, and sample tickets.
- **Edge Case Books in Production**: Verifies null MRP, null publication dates, and zero copies sold for books in production without crashes.
- **JWT Authentication & RBAC**: Validates token generation, role claims, and authorization barriers.
- **AI Auto-Classification & Priority**: Validates classification across all 6 categories and correct priority scoring.
- **Cost-Aware KB Retrieval**: Verifies dynamic chunk filtering without token bloat.
- **AI Draft Response Quality**: Checks empathy, partner tone, policy citations, and 48-hr timelines.

---

##  Trade-Offs & Production Evolution

See the accompanying **[WRITEUP.md](file:///Users/deevs/Documents/Book_leaf/WRITEUP.md)** for the detailed 1-page architectural write-up covering priorities, trade-offs made, and evolution into an enterprise-scale production system.
