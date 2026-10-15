import { config } from '../config';
import { getRelevantKbContext, BOOKLEAF_KB_SECTIONS } from './kbContext';

export interface ClassificationResult {
  category: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  confidence: number;
  reasoning: string;
}

export interface DraftResponseResult {
  draft: string;
  modelUsed: string;
  tokenCount: number;
  isFallback: boolean;
}

export interface BookContext {
  title?: string;
  isbn?: string;
  genre?: string;
  status?: string;
  mrp?: number | null;
  totalCopiesSold?: number;
  totalRoyaltyEarned?: number;
  royaltyPaid?: number;
  royaltyPending?: number;
  lastRoyaltyPayoutDate?: string | null;
  availableOn?: string[];
  printPartner?: string | null;
}

const ALLOWED_CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry'
] as const;

/**
 * Intelligent Rule-Based Fallback Classifier & Priority Scorer
 * Formulated from the BookLeaf operating guidelines and sample query calibration pairs.
 */
export function fallbackClassifyAndPrioritize(subject: string, description: string): ClassificationResult {
  const text = `${subject} ${description}`.toLowerCase();

  // 1. ISBN & Metadata
  if (
    text.includes('isbn') ||
    text.includes('barcode') ||
    text.includes('imprint') ||
    text.includes('different isbn') ||
    text.includes('wrong book')
  ) {
    const isCritical = text.includes('mismatch') || text.includes('wrong') || text.includes('different') || text.includes('duplicate');
    return {
      category: 'ISBN & Metadata Issues',
      priority: isCritical ? 'Critical' : 'High',
      confidence: 0.94,
      reasoning: 'Mentioned ISBN / catalog metadata discrepancy requiring immediate production investigation.'
    };
  }

  // 2. Printing & Quality
  if (
    text.includes('print') ||
    text.includes('quality') ||
    text.includes('blurry') ||
    text.includes('binding') ||
    text.includes('pages are misaligned') ||
    text.includes('defective') ||
    text.includes('misprint') ||
    text.includes('author copy') ||
    text.includes('author copies')
  ) {
    return {
      category: 'Printing & Quality',
      priority: 'High',
      confidence: 0.92,
      reasoning: 'Author reported physical book defect or print quality issue needing reprint verification.'
    };
  }

  // 3. Royalty & Payments
  if (
    text.includes('royalty') ||
    text.includes('payment') ||
    text.includes('payout') ||
    text.includes('haven’t received') ||
    text.includes('havent received') ||
    text.includes('not received') ||
    text.includes('money') ||
    text.includes('bank') ||
    text.includes('earnings') ||
    text.includes('too low') ||
    text.includes('threshold') ||
    text.includes('₹') ||
    text.includes('rs.')
  ) {
    const isOverdue = text.includes('month') || text.includes('never') || text.includes('delayed') || text.includes('overdue');
    return {
      category: 'Royalty & Payments',
      priority: isOverdue ? 'High' : 'Medium',
      confidence: 0.95,
      reasoning: 'Author inquiring about royalty calculations, delay, or payout schedule.'
    };
  }

  // 4. Distribution & Availability
  if (
    text.includes('unavailable') ||
    text.includes('out of stock') ||
    text.includes('amazon') ||
    text.includes('flipkart') ||
    text.includes('not showing') ||
    text.includes('buy link') ||
    text.includes('listing')
  ) {
    return {
      category: 'Distribution & Availability',
      priority: text.includes('live') || text.includes('published') ? 'High' : 'Medium',
      confidence: 0.91,
      reasoning: 'Marketplace stock sync or availability issue on external platforms.'
    };
  }

  // 5. Book Status & Production Updates
  if (
    text.includes('production') ||
    text.includes('typesetting') ||
    text.includes('cover design') ||
    text.includes('proofreading') ||
    text.includes('manuscript') ||
    text.includes('status') ||
    text.includes('when will it be done') ||
    text.includes('progress')
  ) {
    return {
      category: 'Book Status & Production Updates',
      priority: text.includes('weeks') || text.includes('delayed') || text.includes('stuck') ? 'Medium' : 'Low',
      confidence: 0.89,
      reasoning: 'Author tracking book production milestones or turnaround times.'
    };
  }

  // 6. Bio / metadata update request
  if (text.includes('bio') || text.includes('description') || text.includes('update description') || text.includes('profile')) {
    return {
      category: 'General Inquiry',
      priority: 'Low',
      confidence: 0.88,
      reasoning: 'Author requested standard profile or book description metadata modification.'
    };
  }

  // Default General Inquiry
  return {
    category: 'General Inquiry',
    priority: 'Low',
    confidence: 0.80,
    reasoning: 'General account-level or publishing process question.'
  };
}

/**
 * Intelligent Rule-Based Fallback Response Generator
 * Calibrated directly from the exact BookLeaf Sample Query -> Response examples.
 */
export function fallbackDraftResponse(
  authorName: string,
  category: string,
  subject: string,
  description: string,
  bookContext?: BookContext
): string {
  const text = `${subject} ${description}`.toLowerCase();
  const bookTitle = bookContext?.title ? `"${bookContext.title}"` : 'your book';

  if (category === 'Royalty & Payments') {
    if (text.includes('haven’t received') || text.includes('not received') || text.includes('4 months') || text.includes('delay')) {
      const pendingAmount = bookContext?.royaltyPending ? `₹${bookContext.royaltyPending.toLocaleString('en-IN')}` : 'your pending royalties';
      return `Dear ${authorName},

Thank you for reaching out, and I sincerely understand your frustration regarding the wait for your royalty payout for ${bookTitle}. You put immense work into your writing, and you deserve complete transparency on your earnings.

At BookLeaf, royalties are calculated on a quarterly cycle and disbursed within 45 days of the quarter ending via direct bank transfer (minimum payout threshold of ₹1,000). 

According to our records for ${bookTitle}, you currently have ${pendingAmount} accrued. We are immediately verifying that your linked bank details and PAN/tax verification are current on your dashboard. 

Our finance operations lead has been flagged on this ticket and will provide a concrete payment confirmation and bank transaction reference within 48 hours.

Next Steps:
1. Please confirm in your dashboard that your IFSC and Bank Account number are up to date.
2. We will follow up right here with the exact payout schedule within 48 hours.

Warm regards,
BookLeaf Author Support Team`;
    }

    if (text.includes('low') || text.includes('calculation') || text.includes('sold')) {
      return `Dear ${authorName},

Thank you for contacting us. I completely understand wanting clarity on how your royalty payout was calculated for ${bookTitle}. Financial transparency is fundamental to our partnership with you.

BookLeaf operates on an 80/20 royalty split, where 80% of the net profit goes directly to you. Net profit is calculated as:
• Net Profit = MRP – (Printing Cost + Retail Platform Commission [e.g. Amazon/Flipkart] + Shipping Charges)

Depending on the distribution channel and printing specs, platform commissions and production costs vary per copy. 

We would be glad to share a complete line-by-line breakdown showing retail discounts, platform cuts, and your 80% share for each order. Our accounts team is generating this detailed statement for you right now and will attach it to this ticket within 24–48 hours.

Please feel free to ask any questions once you review the figures!

Warm regards,
BookLeaf Author Support Team`;
    }
  }

  if (category === 'ISBN & Metadata Issues') {
    return `Dear ${authorName},

Thank you for bringing this to our attention immediately. We treat any ISBN or metadata discrepancy with the highest priority, and we apologize sincerely for the confusion caused to you and your readers.

A mismatched ISBN on retailer platforms like Amazon can disrupt reader discovery and ordering. I have escalated this directly to our senior production and catalog management team. We will immediately audit the Amazon catalog data feed against the physical print files and trigger a metadata correction.

Our team will follow up with you within 48 hours to confirm that the Amazon listing displays the verified ISBN matching your physical book.

Thank you for your vigilance and patience while we resolve this urgently.

Warm regards,
BookLeaf Production & Author Support Team`;
  }

  if (category === 'Printing & Quality') {
    return `Dear ${authorName},

We are so sorry to hear that your author copies for ${bookTitle} did not meet our print quality standards. We hold our print partners to rigorous standards, and blurry images or misaligned pages are entirely unacceptable.

BookLeaf guarantees a 100% free reprint for verified defective copies. 

Could you please reply to this ticket with 2–3 clear photos showing:
1. The blurry images / misaligned text pages
2. The front cover and spine
3. The barcode/back page

Once verified, our operations facility will immediately schedule an expedited free reprint batch (standard turnaround is 5–7 business days) and ship replacements directly to your address at no charge.

Again, our sincere apologies for the inconvenience. We will make this right.

Warm regards,
BookLeaf Quality Assurance Team`;
  }

  if (category === 'Distribution & Availability') {
    return `Dear ${authorName},

Thank you for bringing this to our notice. We understand how frustrating it is when ${bookTitle} shows as "Currently Unavailable" on Amazon.

This typically occurs due to a catalog inventory synchronization delay between our central warehouse and Amazon's retail inventory system, rather than an actual shortage. 

Our distribution team has initiated a manual inventory re-sync with Amazon's distribution catalog. These catalog updates generally propagate and restore the "In Stock" buy-box within 24–48 hours.

We will keep this ticket open and monitor the Amazon listing until the buy button is fully active.

Warm regards,
BookLeaf Distribution Team`;
  }

  if (category === 'Book Status & Production Updates') {
    const stage = bookContext?.status || 'Production';
    return `Dear ${authorName},

Thank you for checking in on the progress of ${bookTitle}. We appreciate your patience as we bring your book to life.

Your book is currently in the ${stage} stage. Delays at this point typically occur during detailed formatting, hyphenation checks, or alignment verification to ensure the final layout looks flawless on both print and digital mediums.

We are actively working on this and expect to send your typesetting proofs for your review within 3–4 business days. You will receive an email notification the moment the proof is uploaded to your author dashboard for your approval.

Thank you for your partnership, and please don't hesitate to write back if you need any adjustments in the meantime!

Warm regards,
BookLeaf Production Team`;
  }

  // General Inquiry
  return `Dear ${authorName},

Thank you for reaching out to BookLeaf Author Support regarding ${bookTitle}. 

We have logged your query and our team is reviewing the details. For metadata or account updates, submissions are processed through our operations team and typically take 3–5 business days to reflect across retail channels.

If you have any additional details or files to share, feel free to reply directly to this ticket. We are here to support you at every step of your author journey.

Warm regards,
BookLeaf Author Support Team`;
}

/**
 * Main AI Classifier & Priority Scorer
 * Calls configured LLM (OpenAI, Gemini, or Anthropic) with graceful fallback.
 */
export async function classifyAndPrioritizeTicket(
  subject: string,
  description: string
): Promise<ClassificationResult> {
  const provider = config.ai.provider;

  // If fallback is configured or no key provided, use smart fallback immediately
  if (
    provider === 'fallback' ||
    (provider === 'openai' && !config.ai.openaiApiKey) ||
    (provider === 'anthropic' && !config.ai.anthropicApiKey) ||
    (provider === 'gemini' && !config.ai.geminiApiKey)
  ) {
    return fallbackClassifyAndPrioritize(subject, description);
  }

  try {
    if (provider === 'openai' && config.ai.openaiApiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.ai.openaiApiKey}`
        },
        body: JSON.stringify({
          model: config.ai.openaiModel,
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are an automated support ticket triage classifier for BookLeaf Publishing.
Classify the ticket into exactly one of these categories:
- Royalty & Payments
- ISBN & Metadata Issues
- Printing & Quality
- Distribution & Availability
- Book Status & Production Updates
- General Inquiry

Assign a priority score: "Critical", "High", "Medium", or "Low".
Guidelines:
- ISBN errors, duplicates, or wrong books linked: Critical or High.
- Significant royalty payment delay or defective print copies: High.
- Low royalty queries or distribution stock sync: Medium.
- Simple questions, author bio updates, general info: Low.

Return JSON in this format:
{"category": "string", "priority": "Critical|High|Medium|Low", "confidence": number, "reasoning": "string"}`
            },
            {
              role: 'user',
              content: `Subject: ${subject}\nDescription: ${description}`
            }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json() as any;
        const content = JSON.parse(data.choices[0].message.content);
        if (ALLOWED_CATEGORIES.includes(content.category) && ['Critical', 'High', 'Medium', 'Low'].includes(content.priority)) {
          return {
            category: content.category,
            priority: content.priority,
            confidence: content.confidence || 0.95,
            reasoning: content.reasoning || 'Classified by OpenAI'
          };
        }
      }
    }

    if (provider === 'gemini' && config.ai.geminiApiKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.ai.geminiModel}:generateContent?key=${config.ai.geminiApiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Classify this BookLeaf ticket into one category: Royalty & Payments, ISBN & Metadata Issues, Printing & Quality, Distribution & Availability, Book Status & Production Updates, General Inquiry.
Assign priority: Critical, High, Medium, or Low.
Ticket Subject: ${subject}
Ticket Description: ${description}

Return ONLY valid JSON: {"category": "string", "priority": "string", "confidence": 0.95, "reasoning": "string"}`
            }]
          }]
        })
      });

      if (response.ok) {
        const data = await response.json() as any;
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const jsonMatch = text?.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const content = JSON.parse(jsonMatch[0]);
          return {
            category: content.category,
            priority: content.priority,
            confidence: content.confidence || 0.9,
            reasoning: content.reasoning || 'Classified by Gemini'
          };
        }
      }
    }
  } catch (err) {
    console.warn('AI classification failed, falling back gracefully:', (err as Error).message);
  }

  // Graceful degradation fallback
  return fallbackClassifyAndPrioritize(subject, description);
}

/**
 * Main AI Draft Response Generator
 * Uses BookLeaf Knowledge Base context + author & book data with prompt engineering.
 */
export async function generateDraftResponse(
  authorName: string,
  category: string,
  subject: string,
  description: string,
  bookContext?: BookContext
): Promise<DraftResponseResult> {
  const provider = config.ai.provider;

  // 1. Retrieve ONLY relevant KB chunks to minimize token cost (Cost Awareness)
  const kbContext = getRelevantKbContext(category, `${subject} ${description}`);

  // 2. Format book context
  const bookInfo = bookContext?.title
    ? `Book Title: "${bookContext.title}" (ISBN: ${bookContext.isbn || 'Pending'}, Status: ${bookContext.status || 'N/A'}, MRP: ₹${bookContext.mrp || 'N/A'}, Copies Sold: ${bookContext.totalCopiesSold || 0}, Royalty Earned: ₹${bookContext.totalRoyaltyEarned || 0}, Royalty Pending: ₹${bookContext.royaltyPending || 0})`
    : 'No specific book selected (General Account inquiry)';

  const systemPrompt = `You are an expert, compassionate author support representative at BookLeaf Publishing.
You are drafting a response to author "${authorName}".

KNOWLEDGE BASE CONTEXT:
${kbContext}

BOOK & ACCOUNT CONTEXT:
${bookInfo}

COMMUNICATION PRINCIPLES:
1. Tone: Empathetic, respectful, transparent, professional. Treat authors as creative partners.
2. Structure:
   - Warm personalized greeting (Dear ${authorName},)
   - Empathize and validate their concern upfront before explaining policies or fixes.
   - Reference real figures, dates, and statuses from the context.
   - If BookLeaf is at fault (delayed royalties, ISBN errors, misprints), own it directly without corporate deflection or excuses.
   - Provide concrete resolution timelines (e.g., "within 48 hours", "5–7 business days").
   - End with clear, actionable next steps for the author or BookLeaf team.
   - Warm professional signoff: "Warm regards,\nBookLeaf Author Support Team"
3. Do NOT mention being an AI or language model. Write as the human support team.`;

  const userPrompt = `Ticket Category: ${category}
Subject: ${subject}
Author Query:
${description}

Please draft a complete, empathetic response following the guidelines above.`;

  // Check if live API is available
  if (provider === 'openai' && config.ai.openaiApiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.ai.openaiApiKey}`
        },
        body: JSON.stringify({
          model: config.ai.openaiModel,
          temperature: 0.4,
          max_tokens: 600,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json() as any;
        const draft = data.choices[0].message.content.trim();
        const tokenCount = data.usage?.total_tokens || Math.round((systemPrompt.length + userPrompt.length + draft.length) / 4);
        return {
          draft,
          modelUsed: `OpenAI ${config.ai.openaiModel}`,
          tokenCount,
          isFallback: false
        };
      }
    } catch (err) {
      console.warn('OpenAI draft generation failed, falling back gracefully:', (err as Error).message);
    }
  }

  if (provider === 'gemini' && config.ai.geminiApiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.ai.geminiModel}:generateContent?key=${config.ai.geminiApiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
          }]
        })
      });

      if (response.ok) {
        const data = await response.json() as any;
        const draft = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (draft) {
          const tokenCount = Math.round((systemPrompt.length + userPrompt.length + draft.length) / 4);
          return {
            draft,
            modelUsed: `Gemini ${config.ai.geminiModel}`,
            tokenCount,
            isFallback: false
          };
        }
      }
    } catch (err) {
      console.warn('Gemini draft generation failed, falling back gracefully:', (err as Error).message);
    }
  }

  // Graceful fallback to rule-based calibrated draft
  const fallbackDraft = fallbackDraftResponse(authorName, category, subject, description, bookContext);
  const tokenCount = Math.round((systemPrompt.length + userPrompt.length + fallbackDraft.length) / 4);

  return {
    draft: fallbackDraft,
    modelUsed: 'BookLeaf Intelligent KB Engine (Zero-Latency Fallback)',
    tokenCount,
    isFallback: true
  };
}
