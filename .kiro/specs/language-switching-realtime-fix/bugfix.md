# Bugfix Requirements Document

## Introduction

The application currently has inconsistent real-time language switching behavior. On the analysis page, headers and AI-generated texts update immediately when the user changes the language setting. However, this real-time behavior is not consistently implemented across all pages, components, and AI-generated responses throughout the application.

This bugfix ensures that all UI elements, page headers, component labels, and AI-generated content update in real-time when the user changes the language preference, providing a consistent and seamless multilingual experience.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the user changes language on the analysis page THEN headers and AI-generated texts update in real-time

1.2 WHEN the user changes language on other pages (dashboard, entries, credit, pending, reports, chat, account) THEN some UI elements do not update until page refresh or re-render

1.3 WHEN the user changes language THEN some AI-generated responses (from /api/explain, /api/ask, /api/indices/explain, /api/benchmark/explain) do not reflect the new language without manual re-triggering

1.4 WHEN the user changes language THEN component labels in HealthScoreDisplay, CreditTracking, FollowUpPanel, and other components may not update immediately

1.5 WHEN the user changes language THEN navigation labels in the sidebar may not update in real-time

### Expected Behavior (Correct)

2.1 WHEN the user changes language on any page THEN all page headers SHALL update immediately to reflect the new language

2.2 WHEN the user changes language THEN all UI element labels (buttons, form fields, tooltips, placeholders) SHALL update immediately across all components

2.3 WHEN the user changes language THEN all AI-generated content currently displayed SHALL be regenerated in the new language automatically

2.4 WHEN the user changes language THEN navigation labels in the sidebar SHALL update immediately

2.5 WHEN the user changes language THEN all toast notifications and error messages SHALL use the new language for subsequent messages

2.6 WHEN the user changes language THEN component-specific text (HealthScoreDisplay explanations, CreditTracking labels, FollowUpPanel messages) SHALL update immediately

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the user changes language THEN the language preference SHALL CONTINUE TO be persisted in localStorage

3.2 WHEN AI content is regenerated due to language change THEN the underlying data and calculations SHALL CONTINUE TO remain unchanged

3.3 WHEN the user changes language THEN the current user session and authentication state SHALL CONTINUE TO be preserved

3.4 WHEN the user changes language THEN all form input values and user-entered data SHALL CONTINUE TO be retained

3.5 WHEN the user changes language THEN the active section/tab SHALL CONTINUE TO remain the same

3.6 WHEN components receive the language prop THEN they SHALL CONTINUE TO use the translation function (t()) for all displayed text
