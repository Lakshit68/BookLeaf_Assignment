/**
 * BookLeaf Publishing - Knowledge Base Context & Token-Optimized Chunk Retriever
 * 
 * Demonstrates Cost Awareness (Requirement D.4):
 * Instead of dumping the entire monolithic knowledge base into every LLM prompt,
 * we modularize KB topics and selectively retrieve only the relevant chunks based on
 * the ticket category and keyword matching, drastically reducing token consumption.
 */

export interface KbSection {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
}

export const BOOKLEAF_KB_SECTIONS: Record<string, KbSection> = {
  COMPANY_OVERVIEW: {
    id: 'OVERVIEW',
    category: 'General Inquiry',
    title: 'Company Overview & Publishing Packages',
    keywords: ['bookleaf', 'package', 'standard free', 'bestseller breakthrough', 'delhi', 'warehouse', 'repro', 'epitome'],
    content: `
- BookLeaf Publishing is a self-publishing company operating in India and the US.
- Packages: 'Standard Free' (no upfront cost) and 'Bestseller Breakthrough' (premium paid package with marketing & distribution add-ons).
- Services: cover design, typesetting, ISBN assignment, printing, distribution, and royalty management.
- In-house printing facility & warehouse located in Delhi. Print partners include Repro India and Epitome Books.
`.trim()
  },

  ROYALTY_POLICY: {
    id: 'ROYALTY',
    category: 'Royalty & Payments',
    title: 'Royalty & Payout Rules',
    keywords: ['royalty', 'payment', 'payout', 'bank', 'earnings', 'split', '80/20', 'threshold', '1000', 'net profit', 'quarter', 'statement', 'sales', 'commission', 'money', 'paid', 'pending'],
    content: `
- Royalty Split: 80/20 split (80% of net profit goes to author, 20% to BookLeaf).
- Net Profit Formula: Net Profit = MRP - (Printing Cost + Platform Commission [Amazon/Flipkart] + Shipping Charges).
- Calculation & Schedule: Royalties are calculated quarterly and paid within 45 days of the quarter ending.
- Payout Threshold: Minimum payout threshold is ₹1,000. If accumulated royalties are below ₹1,000, they roll over to the next quarter.
- Payment Mode: Direct bank transfer to the account linked in the author's dashboard.
- Transparency: Authors can view a detailed line-by-line royalty breakdown in their dashboard per platform.
`.trim()
  },

  ISBN_POLICY: {
    id: 'ISBN',
    category: 'ISBN & Metadata Issues',
    title: 'ISBN Assignment & Metadata Rules',
    keywords: ['isbn', 'metadata', 'barcode', 'imprint', 'duplicate', 'wrong book', 'amazon link', 'title error', 'description update', 'author bio'],
    content: `
- ISBN Assignment: Every book published through BookLeaf receives a unique ISBN assigned by BookLeaf under BookLeaf's publisher imprint.
- Custom Imprints: If author wants an ISBN under their own imprint, they need to obtain it independently.
- ISBN Errors: If an author reports an ISBN error (duplicate, wrong book linked, mismatch between Amazon and physical copy), it is treated as a HIGH-PRIORITY / CRITICAL issue and immediately escalated to the production team with a 48-hour resolution timeline.
- Metadata Updates: Title, subtitle, description, or bio updates can be submitted via the dashboard and typically reflect on retailer platforms within 3–5 business days.
`.trim()
  },

  PRINTING_QUALITY: {
    id: 'PRINTING',
    category: 'Printing & Quality',
    title: 'Printing, Binding, Turnaround & Quality Guarantee',
    keywords: ['print', 'quality', 'misprint', 'binding', 'color', 'paper', 'defective', 'blurry', 'damaged', 'author copy', 'author copies', 'turnaround', 'reprint'],
    content: `
- Facilities: In-house printing in Delhi handles most orders. Overflow or specific format requirements go to Repro India or Epitome Books.
- Standard Turnaround: 5–7 business days from order confirmation.
- Quality Guarantee: If an author reports a quality issue (misprints, binding defects, color inconsistency, damaged pages), BookLeaf apologizes sincerely and arranges a 100% FREE reprint after verification.
- Author Action: Author is asked to share clear photos of defective copies. Replacement turnaround is 5–7 business days.
`.trim()
  },

  DISTRIBUTION_AVAILABILITY: {
    id: 'DISTRIBUTION',
    category: 'Distribution & Availability',
    title: 'Distribution Channels & Stock Availability',
    keywords: ['distribution', 'amazon', 'flipkart', 'store', 'unavailable', 'out of stock', 'listing', 'stock sync', 'uk', 'us', 'buy link'],
    content: `
- Channels: Books are listed on Amazon India, Flipkart, Amazon US, Amazon UK, and the BookLeaf Store.
- Listing Timeline: New listings typically go live within 7–10 business days after publication is complete.
- Stock Sync / Unavailable Issue: If a live book shows as "Currently Unavailable" on Amazon or Flipkart, it usually indicates a stock catalog sync issue. BookLeaf's distribution team triggers a re-sync within 24–48 hours to restore availability.
`.trim()
  },

  PRODUCTION_STAGES: {
    id: 'PRODUCTION',
    category: 'Book Status & Production Updates',
    title: 'Production Lifecycle & Timeline Stages',
    keywords: ['production', 'status', 'stages', 'manuscript', 'editing', 'cover design', 'typesetting', 'proofreading', 'isbn assignment', 'delays', 'proof'],
    content: `
- Sequential Stages: Manuscript Received → Editing (if opted) → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Distribution Setup → Published & Live.
- Author Updates: Authors are updated at each stage via email/dashboard notifications.
- Known Bottlenecks: Delays typically happen at Cover Design (waiting for author approval) and Proofreading (revision rounds).
- Tone on Delays: Check actual status. Be honest and transparent about reasons without blaming the author, even if waiting on author approval. Frame collaboratively with an updated specific timeline.
`.trim()
  }
};

export const COMMUNICATION_TONE_GUIDELINES = `
Communication Tone & Policy Guidelines:
- Tone: Empathetic, respectful, transparent, and professional. Authors are partners, not support tickets to close.
- First Step: Always acknowledge and validate the author's concern warmly before proposing solutions.
- Specificity: Provide concrete numbers, dates, statuses, and policy details (not vague reassurances).
- Ownership: If something is BookLeaf's fault (e.g. delayed payout, ISBN mismatch, defective print), own it directly and apologize sincerely. No corporate deflection.
- Escalation Commitment: Give clear, concrete timelines (e.g. "our production team has been notified and will resolve this within 48 hours") rather than open-ended promises.
- Actionable Conclusion: Always end with a clear next step for the author or BookLeaf team.
- Signoff: "Warm regards, BookLeaf Author Support Team".
`.trim();

/**
 * Smart KB Context Selector
 * Selects only the most relevant KB sections for the query + category to optimize token usage.
 */
export function getRelevantKbContext(category?: string, queryText?: string): string {
  const selectedSections = new Set<string>();
  const queryLower = (queryText || '').toLowerCase();

  // 1. Direct category match
  for (const [key, section] of Object.entries(BOOKLEAF_KB_SECTIONS)) {
    if (category && section.category.toLowerCase() === category.toLowerCase()) {
      selectedSections.add(key);
    }
  }

  // 2. Keyword relevance search
  for (const [key, section] of Object.entries(BOOKLEAF_KB_SECTIONS)) {
    for (const kw of section.keywords) {
      if (queryLower.includes(kw)) {
        selectedSections.add(key);
        break;
      }
    }
  }

  // 3. Always include overview if no specific match found or general inquiry
  if (selectedSections.size === 0 || category === 'General Inquiry') {
    selectedSections.add('COMPANY_OVERVIEW');
  }

  // Combine selected chunks
  const chunks = Array.from(selectedSections).map(key => {
    const s = BOOKLEAF_KB_SECTIONS[key];
    return `### ${s.title}\n${s.content}`;
  });

  return `${chunks.join('\n\n')}\n\n### Tone & Voice Guidelines\n${COMMUNICATION_TONE_GUIDELINES}`;
}
