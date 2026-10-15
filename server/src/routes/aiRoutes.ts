import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { config } from '../config';
import { BOOKLEAF_KB_SECTIONS, COMMUNICATION_TONE_GUIDELINES } from '../services/kbContext';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * Returns active AI engine status, model info, and Knowledge Base overview
 */
router.get('/status', (req: Request, res: Response) => {
  res.json({
    activeProvider: config.ai.provider,
    models: {
      openai: config.ai.openaiModel,
      gemini: config.ai.geminiModel,
      anthropic: config.ai.anthropicModel
    },
    hasOpenAiKey: Boolean(config.ai.openaiApiKey),
    hasGeminiKey: Boolean(config.ai.geminiApiKey),
    hasAnthropicKey: Boolean(config.ai.anthropicApiKey),
    fallbackEngineStatus: 'Active & Ready (Zero External Downtime)',
    knowledgeBaseSectionsCount: Object.keys(BOOKLEAF_KB_SECTIONS).length,
    toneGuidelines: COMMUNICATION_TONE_GUIDELINES
  });
});

/**
 * Returns Knowledge Base sections for admin reference
 */
router.get('/knowledge-base', (req: Request, res: Response) => {
  res.json({
    sections: BOOKLEAF_KB_SECTIONS,
    toneGuidelines: COMMUNICATION_TONE_GUIDELINES
  });
});

export default router;
