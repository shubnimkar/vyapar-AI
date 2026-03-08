'use client';

import { useState } from 'react';
import { DailySuggestion, Language } from '@/lib/types';
import { t } from '@/lib/translations';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, Zap, Lightbulb, X } from 'lucide-react';

interface DailySuggestionCardProps {
  suggestions: DailySuggestion[];
  language: Language;
  onDismiss: (suggestionId: string) => void;
}

/**
 * Daily Suggestion Card Component
 * 
 * Pure presentation component (per Vyapar rules) that displays the highest priority 
 * undismissed suggestion using the new design system components.
 * 
 * Features:
 * - Uses Card component with elevation
 * - Uses Badge component for severity indicators
 * - Uses Button component for dismiss action
 * - Icons from lucide-react for visual clarity
 * - Severity-based styling (critical=red, warning=orange, info=blue)
 * - Localized title and description
 * - Accessibility features
 * 
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirements 7.x, 5.x
 */
export default function DailySuggestionCard({
  suggestions,
  language,
  onDismiss
}: DailySuggestionCardProps) {
  const [dismissing, setDismissing] = useState(false);

  // Filter undismissed suggestions
  const undismissed = suggestions.filter(s => !s.dismissed_at);
  
  if (undismissed.length === 0) {
    return null;
  }
  
  // Sort by severity (critical > warning > info)
  const sortedSuggestions = [...undismissed].sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
  
  const topSuggestion = sortedSuggestions[0];
  
  // Translate title and description on-the-fly based on current language
  const getTranslatedTitle = (suggestion: DailySuggestion): string => {
    if (suggestion.title_key) {
      return t(suggestion.title_key, language);
    }
    // Fallback to stored title for backward compatibility
    return suggestion.title;
  };
  
  const getTranslatedDescription = (suggestion: DailySuggestion): string => {
    if (suggestion.description_key) {
      let description = t(suggestion.description_key, language);
      
      // Replace parameters if they exist
      if (suggestion.description_params) {
        Object.entries(suggestion.description_params).forEach(([key, value]) => {
          description = description.replace(`{${key}}`, value);
        });
      }
      
      return description;
    }
    // Fallback to stored description for backward compatibility
    return suggestion.description;
  };
  
  const translatedTitle = getTranslatedTitle(topSuggestion);
  const translatedDescription = getTranslatedDescription(topSuggestion);
  
  // Severity configuration using design system
  const severityConfig = {
    critical: {
      icon: AlertTriangle,
      badgeVariant: 'error' as BadgeVariant,
      iconColor: 'text-error-600',
      iconBg: 'bg-error-100',
      textColor: 'text-error-900',
      descColor: 'text-error-700'
    },
    warning: {
      icon: Zap,
      badgeVariant: 'warning' as BadgeVariant,
      iconColor: 'text-warning-600',
      iconBg: 'bg-warning-100',
      textColor: 'text-warning-900',
      descColor: 'text-warning-700'
    },
    info: {
      icon: Lightbulb,
      badgeVariant: 'info' as BadgeVariant,
      iconColor: 'text-info-600',
      iconBg: 'bg-info-100',
      textColor: 'text-info-900',
      descColor: 'text-info-700'
    }
  };
  
  const config = severityConfig[topSuggestion.severity];
  const IconComponent = config.icon;
  
  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await onDismiss(topSuggestion.id);
    } catch (error) {
      console.error('Failed to dismiss suggestion:', error);
    } finally {
      setDismissing(false);
    }
  };
  
  return (
    <Card
      elevation="raised"
      density="comfortable"
      className="mb-4"
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          {/* Header with icon, badge, and title */}
          <CardHeader>
            <div className="flex items-center gap-3 mb-3">
              <div className={`${config.iconBg} rounded-full p-2 flex items-center justify-center`}>
                <IconComponent className={`w-6 h-6 ${config.iconColor}`} aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-semibold text-base ${config.textColor}`}>
                    {t('daily.todaysSuggestion', language)}
                  </h3>
                  <Badge variant={config.badgeVariant}>
                    {topSuggestion.severity}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          
          {/* Suggestion content */}
          <CardBody>
            <h4 className={`font-medium mb-2 ${config.textColor}`}>
              {translatedTitle}
            </h4>
            <p className={`text-sm ${config.descColor}`}>
              {translatedDescription}
            </p>
            
            {/* Additional suggestions indicator */}
            {undismissed.length > 1 && (
              <div className="mt-3 text-xs text-neutral-600">
                +{undismissed.length - 1} {undismissed.length === 2 ? 'more suggestion' : 'more suggestions'}
              </div>
            )}
          </CardBody>
        </div>
        
        {/* Dismiss button using new Button component */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          loading={dismissing}
          icon={<X className="w-4 h-4" />}
          className="shrink-0"
          aria-label={t('dismiss', language)}
          title={t('dismiss', language)}
        />
      </div>
    </Card>
  );
}
