/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BenchmarkDisplay from '../BenchmarkDisplay';
import { BenchmarkComparison, Language } from '@/lib/types';

// Mock the translation function
jest.mock('@/lib/translations', () => ({
  t: (key: string, language: string) => {
    const translations: Record<string, Record<string, string>> = {
      'benchmark.title': {
        en: 'Business Benchmark',
        hi: 'व्यापार तुलना',
        mr: 'व्यवसाय तुलना'
      },
      'benchmark.healthScore': {
        en: 'Health Score',
        hi: 'स्वास्थ्य स्कोर',
        mr: 'आरोग्य स्कोअर'
      },
      'benchmark.profitMargin': {
        en: 'Profit Margin',
        hi: 'लाभ मार्जिन',
        mr: 'नफा मार्जिन'
      },
      'benchmark.yourBusiness': {
        en: 'Your Business',
        hi: 'आपका व्यापार',
        mr: 'तुमचा व्यवसाय'
      },
      'benchmark.segmentAverage': {
        en: 'Similar Businesses',
        hi: 'समान व्यापार',
        mr: 'समान व्यवसाय'
      },
      'benchmark.category.above_average': {
        en: 'Above Average',
        hi: 'औसत से ऊपर',
        mr: 'सरासरीपेक्षा जास्त'
      },
      'benchmark.category.at_average': {
        en: 'At Average',
        hi: 'औसत पर',
        mr: 'सरासरी'
      },
      'benchmark.category.below_average': {
        en: 'Below Average',
        hi: 'औसत से नीचे',
        mr: 'सरासरीपेक्षा कमी'
      },
      'benchmark.sampleSize': {
        en: 'Based on {count} businesses',
        hi: '{count} व्यापारों के आधार पर',
        mr: '{count} व्यवसायांवर आधारित'
      },
      'benchmark.limitedData': {
        en: 'Limited data - comparison may not be representative',
        hi: 'सीमित डेटा - तुलना प्रतिनिधि नहीं हो सकती',
        mr: 'मर्यादित डेटा - तुलना प्रतिनिधी नसू शकते'
      },
      'benchmark.staleData': {
        en: 'Data is {days} days old',
        hi: 'डेटा {days} दिन पुराना है',
        mr: 'डेटा {days} दिवस जुना आहे'
      },
      'benchmark.noData': {
        en: 'No comparison data available. Complete your profile to see benchmarks.',
        hi: 'कोई तुलना डेटा उपलब्ध नहीं है। बेंचमार्क देखने के लिए अपनी प्रोफ़ाइल पूरी करें।',
        mr: 'तुलना डेटा उपलब्ध नाही. बेंचमार्क पाहण्यासाठी तुमची प्रोफाइल पूर्ण करा.'
      }
    };
    
    return translations[key]?.[language] || key;
  }
}));

describe('BenchmarkDisplay', () => {
  const mockComparison: BenchmarkComparison = {
    healthScoreComparison: {
      userValue: 75,
      segmentMedian: 65,
      percentile: 65,
      category: 'above_average'
    },
    marginComparison: {
      userValue: 0.25,
      segmentMedian: 0.20,
      percentile: 62,
      category: 'above_average'
    },
    segmentInfo: {
      segmentKey: 'SEGMENT#tier1#kirana',
      sampleSize: 150,
      lastUpdated: new Date().toISOString()
    },
    calculatedAt: new Date().toISOString()
  };

  describe('Loading State', () => {
    it('should render loading skeleton when isLoading is true', () => {
      render(
        <BenchmarkDisplay
          comparison={null}
          language="en"
          isLoading={true}
        />
      );

      const skeleton = document.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should render error message when error prop is provided', () => {
      const errorMessage = 'Failed to load benchmark data';
      render(
        <BenchmarkDisplay
          comparison={null}
          language="en"
          isLoading={false}
          error={errorMessage}
        />
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  describe('No Data State', () => {
    it('should render no data message when comparison is null', () => {
      render(
        <BenchmarkDisplay
          comparison={null}
          language="en"
          isLoading={false}
        />
      );

      expect(screen.getByText(/No comparison data available/i)).toBeInTheDocument();
    });
  });

  describe('Valid Comparison Data', () => {
    it('should render health score comparison', () => {
      render(
        <BenchmarkDisplay
          comparison={mockComparison}
          language="en"
          isLoading={false}
        />
      );

      expect(screen.getByText('Health Score')).toBeInTheDocument();
      expect(screen.getByText('75')).toBeInTheDocument();
      expect(screen.getByText('65')).toBeInTheDocument();
      expect(screen.getAllByText(/Above Average/).length).toBeGreaterThan(0);
    });

    it('should render profit margin comparison', () => {
      render(
        <BenchmarkDisplay
          comparison={mockComparison}
          language="en"
          isLoading={false}
        />
      );

      expect(screen.getByText('Profit Margin')).toBeInTheDocument();
      expect(screen.getByText('25.0%')).toBeInTheDocument();
      expect(screen.getByText('20.0%')).toBeInTheDocument();
    });

    it('should render sample size info', () => {
      render(
        <BenchmarkDisplay
          comparison={mockComparison}
          language="en"
          isLoading={false}
        />
      );

      expect(screen.getByText(/Based on 150 businesses/i)).toBeInTheDocument();
    });
  });

  describe('Limited Data Warning', () => {
    it('should show warning when sample size < 10', () => {
      const limitedComparison: BenchmarkComparison = {
        ...mockComparison,
        segmentInfo: {
          ...mockComparison.segmentInfo,
          sampleSize: 5
        }
      };

      render(
        <BenchmarkDisplay
          comparison={limitedComparison}
          language="en"
          isLoading={false}
        />
      );

      expect(screen.getByText(/Limited data/i)).toBeInTheDocument();
    });

    it('should not show warning when sample size >= 10', () => {
      render(
        <BenchmarkDisplay
          comparison={mockComparison}
          language="en"
          isLoading={false}
        />
      );

      expect(screen.queryByText(/Limited data/i)).not.toBeInTheDocument();
    });
  });

  describe('Stale Data Indicator', () => {
    it('should show stale data indicator when data > 7 days old', () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 10);

      const staleComparison: BenchmarkComparison = {
        ...mockComparison,
        segmentInfo: {
          ...mockComparison.segmentInfo,
          lastUpdated: staleDate.toISOString()
        }
      };

      render(
        <BenchmarkDisplay
          comparison={staleComparison}
          language="en"
          isLoading={false}
        />
      );

      expect(screen.getByText(/10 days old/i)).toBeInTheDocument();
    });

    it('should not show stale indicator when data <= 7 days old', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3);

      const recentComparison: BenchmarkComparison = {
        ...mockComparison,
        segmentInfo: {
          ...mockComparison.segmentInfo,
          lastUpdated: recentDate.toISOString()
        }
      };

      render(
        <BenchmarkDisplay
          comparison={recentComparison}
          language="en"
          isLoading={false}
        />
      );

      expect(screen.queryByText(/days old/i)).not.toBeInTheDocument();
    });
  });

  describe('Visual Indicator Mapping', () => {
    it('should show correct indicator for above_average category', () => {
      render(
        <BenchmarkDisplay
          comparison={mockComparison}
          language="en"
          isLoading={false}
        />
      );

      const indicators = screen.getAllByText(/📈/);
      expect(indicators.length).toBeGreaterThan(0);
    });

    it('should show correct indicator for at_average category', () => {
      const atAverageComparison: BenchmarkComparison = {
        ...mockComparison,
        healthScoreComparison: {
          ...mockComparison.healthScoreComparison,
          category: 'at_average'
        },
        marginComparison: {
          ...mockComparison.marginComparison,
          category: 'at_average'
        }
      };

      render(
        <BenchmarkDisplay
          comparison={atAverageComparison}
          language="en"
          isLoading={false}
        />
      );

      const indicators = screen.getAllByText(/➡️/);
      expect(indicators.length).toBeGreaterThan(0);
    });

    it('should show correct indicator for below_average category', () => {
      const belowAverageComparison: BenchmarkComparison = {
        ...mockComparison,
        healthScoreComparison: {
          ...mockComparison.healthScoreComparison,
          category: 'below_average'
        },
        marginComparison: {
          ...mockComparison.marginComparison,
          category: 'below_average'
        }
      };

      render(
        <BenchmarkDisplay
          comparison={belowAverageComparison}
          language="en"
          isLoading={false}
        />
      );

      const indicators = screen.getAllByText(/📉/);
      expect(indicators.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-Language Support', () => {
    it('should render in Hindi', () => {
      render(
        <BenchmarkDisplay
          comparison={mockComparison}
          language="hi"
          isLoading={false}
        />
      );

      expect(screen.getByText('व्यापार तुलना')).toBeInTheDocument();
      expect(screen.getByText('स्वास्थ्य स्कोर')).toBeInTheDocument();
    });

    it('should render in Marathi', () => {
      render(
        <BenchmarkDisplay
          comparison={mockComparison}
          language="mr"
          isLoading={false}
        />
      );

      expect(screen.getByText('व्यवसाय तुलना')).toBeInTheDocument();
      expect(screen.getByText('आरोग्य स्कोअर')).toBeInTheDocument();
    });
  });
});
