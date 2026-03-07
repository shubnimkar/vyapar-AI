// Integration tests for benchmark explanation API endpoint
// Tests AI explanation with graceful degradation

import { POST } from '@/app/api/benchmark/explain/route';
import { NextRequest } from 'next/server';
import { ProfileService } from '@/lib/dynamodb-client';
import { invokeBedrockModel } from '@/lib/bedrock-client';

// Mock dependencies
jest.mock('@/lib/dynamodb-client');
jest.mock('@/lib/bedrock-client');

describe('POST /api/benchmark/explain', () => {
  const mockComparison = {
    healthScoreComparison: {
      userValue: 75,
      segmentMedian: 65,
      percentile: 65,
      category: 'above_average',
    },
    marginComparison: {
      userValue: 0.22,
      segmentMedian: 0.18,
      percentile: 62,
      category: 'above_average',
    },
    segmentInfo: {
      segmentKey: 'SEGMENT#tier1#kirana',
      sampleSize: 250,
      lastUpdated: '2024-01-15T10:00:00Z',
    },
    calculatedAt: '2024-01-15T10:30:00Z',
  };

  const mockProfile = {
    userId: 'user123',
    business_type: 'kirana',
    city_tier: 'tier-1',
    explanation_mode: 'simple',
    language: 'en',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return AI explanation for valid request', async () => {
    // Mock profile retrieval
    (ProfileService.getProfile as jest.Mock).mockResolvedValue(mockProfile);

    // Mock successful Bedrock response
    (invokeBedrockModel as jest.Mock).mockResolvedValue({
      success: true,
      content: 'Your business is performing above average compared to similar businesses.',
    });

    const request = new NextRequest('http://localhost:3000/api/benchmark/explain', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user123',
        comparison: mockComparison,
        language: 'en',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.explanation).toBeTruthy();
    expect(typeof data.explanation).toBe('string');
  });

  it('should return 400 for missing userId', async () => {
    const request = new NextRequest('http://localhost:3000/api/benchmark/explain', {
      method: 'POST',
      body: JSON.stringify({
        comparison: mockComparison,
        language: 'en',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('should return 400 for missing comparison', async () => {
    const request = new NextRequest('http://localhost:3000/api/benchmark/explain', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user123',
        language: 'en',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('should return 400 for invalid comparison structure', async () => {
    const request = new NextRequest('http://localhost:3000/api/benchmark/explain', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user123',
        comparison: {
          // Missing required fields
          healthScoreComparison: {},
        },
        language: 'en',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('should return 400 for incomplete profile', async () => {
    // Mock incomplete profile
    (ProfileService.getProfile as jest.Mock).mockResolvedValue({
      userId: 'user123',
      // Missing business_type and explanation_mode
    });

    const request = new NextRequest('http://localhost:3000/api/benchmark/explain', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user123',
        comparison: mockComparison,
        language: 'en',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('should gracefully degrade when AI is unavailable', async () => {
    // Mock profile retrieval
    (ProfileService.getProfile as jest.Mock).mockResolvedValue(mockProfile);

    // Mock Bedrock failure
    (invokeBedrockModel as jest.Mock).mockResolvedValue({
      success: false,
    });

    const request = new NextRequest('http://localhost:3000/api/benchmark/explain', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user123',
        comparison: mockComparison,
        language: 'en',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    // Should still return success but with null explanation
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.explanation).toBeNull();
    expect(data.message).toContain('temporarily unavailable');
  });

  it('should gracefully degrade when Bedrock throws error', async () => {
    // Mock profile retrieval
    (ProfileService.getProfile as jest.Mock).mockResolvedValue(mockProfile);

    // Mock Bedrock error
    (invokeBedrockModel as jest.Mock).mockRejectedValue(new Error('Network error'));

    const request = new NextRequest('http://localhost:3000/api/benchmark/explain', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user123',
        comparison: mockComparison,
        language: 'en',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    // Should still return success but with null explanation
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.explanation).toBeNull();
  });

  it('should support Hindi language', async () => {
    // Mock profile with Hindi
    (ProfileService.getProfile as jest.Mock).mockResolvedValue({
      ...mockProfile,
      language: 'hi',
    });

    (invokeBedrockModel as jest.Mock).mockResolvedValue({
      success: true,
      content: 'आपका व्यापार औसत से ऊपर है।',
    });

    const request = new NextRequest('http://localhost:3000/api/benchmark/explain', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user123',
        comparison: mockComparison,
        language: 'hi',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.explanation).toBeTruthy();
  });

  it('should support Marathi language', async () => {
    // Mock profile with Marathi
    (ProfileService.getProfile as jest.Mock).mockResolvedValue({
      ...mockProfile,
      language: 'mr',
    });

    (invokeBedrockModel as jest.Mock).mockResolvedValue({
      success: true,
      content: 'तुमचा व्यवसाय सरासरीपेक्षा जास्त आहे।',
    });

    const request = new NextRequest('http://localhost:3000/api/benchmark/explain', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user123',
        comparison: mockComparison,
        language: 'mr',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.explanation).toBeTruthy();
  });

  it('should handle different business types', async () => {
    const businessTypes = ['kirana', 'salon', 'pharmacy', 'restaurant', 'other'];

    for (const businessType of businessTypes) {
      // Mock profile with different business type
      (ProfileService.getProfile as jest.Mock).mockResolvedValue({
        ...mockProfile,
        business_type: businessType,
      });

      (invokeBedrockModel as jest.Mock).mockResolvedValue({
        success: true,
        content: `Explanation for ${businessType}`,
      });

      const request = new NextRequest('http://localhost:3000/api/benchmark/explain', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user123',
          comparison: mockComparison,
          language: 'en',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    }
  });

  it('should handle different explanation modes', async () => {
    const modes = ['simple', 'detailed'];

    for (const mode of modes) {
      // Mock profile with different explanation mode
      (ProfileService.getProfile as jest.Mock).mockResolvedValue({
        ...mockProfile,
        explanation_mode: mode,
      });

      (invokeBedrockModel as jest.Mock).mockResolvedValue({
        success: true,
        content: `${mode} explanation`,
      });

      const request = new NextRequest('http://localhost:3000/api/benchmark/explain', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user123',
          comparison: mockComparison,
          language: 'en',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    }
  });

  it('should reject oversized request body', async () => {
    // Create a very large comparison object
    const largeComparison = {
      ...mockComparison,
      extraData: 'x'.repeat(2 * 1024 * 1024), // 2MB of data
    };

    const request = new NextRequest('http://localhost:3000/api/benchmark/explain', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user123',
        comparison: largeComparison,
        language: 'en',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(413); // Payload Too Large
  });
});
