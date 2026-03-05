// Persona-Aware AI Types
// Defines interfaces for persona context and prompt structure

export interface PersonaContext {
  business_type: 'kirana' | 'salon' | 'pharmacy' | 'restaurant' | 'other';
  city_tier?: 'tier-1' | 'tier-2' | 'tier-3' | 'rural' | null;
  explanation_mode: 'simple' | 'detailed';
  language: 'en' | 'hi' | 'mr';
}

export interface PromptStructure {
  system: string;      // System instructions with persona context
  user: string;        // User message with data and question
  metadata?: {         // For logging only
    business_type: string;
    city_tier?: string | null;
    explanation_mode: string;
    prompt_type: string;
  };
}

export type PromptType = 'explain' | 'analyze' | 'ask';
