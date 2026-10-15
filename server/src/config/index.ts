import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'bookleaf_jwt_super_secret_key_change_in_production_2026',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  dbPath: path.resolve(__dirname, '../../data/bookleaf.db'),
  uploadDir: path.resolve(__dirname, '../../uploads'),
  ai: {
    provider: (process.env.AI_PROVIDER || 'fallback') as 'openai' | 'anthropic' | 'gemini' | 'fallback',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  }
};
