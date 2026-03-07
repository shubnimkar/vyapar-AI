/**
 * Integration test for language switching functionality
 * Verifies that AI-generated content (recommendations and alerts) updates when language changes
 */

import { generateMockRecommendations, generateMockAlerts } from '@/lib/bedrock-client-mock';
import { Language } from '@/lib/types';

describe('Language Switching for AI Content', () => {
  describe('Recommendations Language Switching', () => {
    it('should generate recommendations in English', () => {
      const recommendations = generateMockRecommendations('en');
      
      expect(recommendations).toHaveLength(4);
      expect(recommendations[0].action).toContain('Increase Sugar price');
      expect(recommendations[1].action).toContain('Stop stocking Detergent');
    });

    it('should generate recommendations in Hindi', () => {
      const recommendations = generateMockRecommendations('hi');
      
      expect(recommendations).toHaveLength(4);
      expect(recommendations[0].action).toContain('चीनी की कीमत');
      expect(recommendations[1].action).toContain('डिटर्जेंट');
    });

    it('should generate recommendations in Marathi', () => {
      const recommendations = generateMockRecommendations('mr');
      
      expect(recommendations).toHaveLength(4);
      expect(recommendations[0].action).toContain('साखरेची किंमत');
      expect(recommendations[1].action).toContain('डिटर्जंट');
    });

    it('should maintain same structure across languages', () => {
      const languages: Language[] = ['en', 'hi', 'mr'];
      
      languages.forEach(lang => {
        const recommendations = generateMockRecommendations(lang);
        
        expect(recommendations).toHaveLength(4);
        recommendations.forEach(rec => {
          expect(rec).toHaveProperty('action');
          expect(rec).toHaveProperty('impact');
          expect(rec).toHaveProperty('priority');
          expect(rec).toHaveProperty('severity');
          expect(typeof rec.action).toBe('string');
          expect(typeof rec.impact).toBe('string');
          expect(typeof rec.priority).toBe('number');
          expect(['critical', 'warning', 'good', 'info']).toContain(rec.severity);
        });
      });
    });
  });

  describe('Alerts Language Switching', () => {
    it('should generate alerts in English', () => {
      const alerts = generateMockAlerts('en');
      
      expect(alerts).toHaveLength(3);
      expect(alerts[0].message).toContain('Cashflow alert');
      expect(alerts[1].message).toContain('Cooking Oil inventory low');
    });

    it('should generate alerts in Hindi', () => {
      const alerts = generateMockAlerts('hi');
      
      expect(alerts).toHaveLength(3);
      expect(alerts[0].message).toContain('कैशफ्लो अलर्ट');
      expect(alerts[1].message).toContain('कुकिंग ऑयल');
    });

    it('should generate alerts in Marathi', () => {
      const alerts = generateMockAlerts('mr');
      
      expect(alerts).toHaveLength(3);
      expect(alerts[0].message).toContain('कॅशफ्लो अलर्ट');
      expect(alerts[1].message).toContain('कुकिंग ऑइल');
    });

    it('should maintain same structure across languages', () => {
      const languages: Language[] = ['en', 'hi', 'mr'];
      
      languages.forEach(lang => {
        const alerts = generateMockAlerts(lang);
        
        expect(alerts).toHaveLength(3);
        alerts.forEach(alert => {
          expect(alert).toHaveProperty('type');
          expect(alert).toHaveProperty('severity');
          expect(alert).toHaveProperty('message');
          expect(alert).toHaveProperty('icon');
          expect(['cashflow', 'inventory', 'expense', 'credit']).toContain(alert.type);
          expect(['critical', 'warning', 'good', 'info']).toContain(alert.severity);
          expect(typeof alert.message).toBe('string');
          expect(typeof alert.icon).toBe('string');
        });
      });
    });
  });

  describe('Content Consistency', () => {
    it('should have same number of recommendations across all languages', () => {
      const enRecs = generateMockRecommendations('en');
      const hiRecs = generateMockRecommendations('hi');
      const mrRecs = generateMockRecommendations('mr');
      
      expect(enRecs.length).toBe(hiRecs.length);
      expect(hiRecs.length).toBe(mrRecs.length);
    });

    it('should have same number of alerts across all languages', () => {
      const enAlerts = generateMockAlerts('en');
      const hiAlerts = generateMockAlerts('hi');
      const mrAlerts = generateMockAlerts('mr');
      
      expect(enAlerts.length).toBe(hiAlerts.length);
      expect(hiAlerts.length).toBe(mrAlerts.length);
    });

    it('should have same priorities across languages for recommendations', () => {
      const enRecs = generateMockRecommendations('en');
      const hiRecs = generateMockRecommendations('hi');
      const mrRecs = generateMockRecommendations('mr');
      
      for (let i = 0; i < enRecs.length; i++) {
        expect(enRecs[i].priority).toBe(hiRecs[i].priority);
        expect(hiRecs[i].priority).toBe(mrRecs[i].priority);
        expect(enRecs[i].severity).toBe(hiRecs[i].severity);
        expect(hiRecs[i].severity).toBe(mrRecs[i].severity);
      }
    });

    it('should have same severity across languages for alerts', () => {
      const enAlerts = generateMockAlerts('en');
      const hiAlerts = generateMockAlerts('hi');
      const mrAlerts = generateMockAlerts('mr');
      
      for (let i = 0; i < enAlerts.length; i++) {
        expect(enAlerts[i].severity).toBe(hiAlerts[i].severity);
        expect(hiAlerts[i].severity).toBe(mrAlerts[i].severity);
        expect(enAlerts[i].type).toBe(hiAlerts[i].type);
        expect(hiAlerts[i].type).toBe(mrAlerts[i].type);
      }
    });
  });
});
