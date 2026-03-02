// Supabase Auth Types
// Defines authentication session and user interfaces for compatibility

// ============================================
// Type Definitions
// ============================================

export interface User {
  id: string;
  phoneNumber: string; // Keep for compatibility
  createdAt: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
  user: User;
}

// ============================================
// Supabase Auth Mock (for demo purposes)
// ============================================

export class SupabaseAuth {
  /**
   * Mock refresh session for compatibility
   * In real implementation, this would call Supabase
   */
  static async refreshSession(): Promise<{
    success: boolean;
    session?: AuthSession;
    error?: string;
  }> {
    // For demo purposes, always return failure to force re-authentication
    return {
      success: false,
      error: 'Session refresh not supported in demo mode'
    };
  }
}