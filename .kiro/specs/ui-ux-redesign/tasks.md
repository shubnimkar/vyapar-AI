# Implementation Plan: UI/UX Redesign

## Overview

This implementation plan transforms the Vyapar AI application with an international-grade design system. The approach follows a bottom-up strategy: establish design tokens first, build utility functions, create base UI components, implement navigation components, update existing pages, and validate with comprehensive property-based testing.

The design system follows the hybrid intelligence principle (deterministic-first architecture), ensures offline-first functionality, and meets WCAG 2.1 AA accessibility standards. All 36 correctness properties will be validated through property-based tests using fast-check.

## Implementation Strategy

1. **Foundation Layer**: Design tokens + Tailwind configuration + utility functions
2. **Component Layer**: 11 base UI components (Button, Input, Card, Toast, Skeleton, EmptyState, ErrorState, Spinner, Badge, Progress, Navigation)
3. **Integration Layer**: Update existing feature components to use new design system
4. **Validation Layer**: Property-based tests for all 36 correctness properties
5. **Optimization Layer**: Accessibility testing and performance optimization

## Tasks

- [x] 1. Set up design token system and configuration
  - Create `lib/design-system/tokens.ts` with all design tokens (colors, typography, spacing, shadows, borderRadius, animation, breakpoints)
  - Update `tailwind.config.ts` to use design tokens
  - Create `lib/design-system/types.ts` with TypeScript types for design tokens
  - Install required dependencies: `clsx`, `tailwind-merge`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [x] 1.1 Write property test for design token completeness
  - **Property 1: Design Token Completeness**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7**

- [x] 1.2 Write property test for color palette structure
  - **Property 2: Color Palette Structure**
  - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 1.3 Write property test for typography scale completeness
  - **Property 3: Typography Scale Completeness**
  - **Validates: Requirements 2.2**

- [x] 1.4 Write property test for spacing scale consistency
  - **Property 4: Spacing Scale Consistency**
  - **Validates: Requirements 4.1**

- [x] 2. Create design system utility functions
  - Create `lib/design-system/utils.ts` with `cn()` class merger utility
  - Add `formatCurrency()` function for Indian currency formatting (₹1,00,000)
  - Add `formatPercentage()` function with 1 decimal place
  - Add `getFinancialColor()` and `getFinancialBgColor()` utilities
  - _Requirements: 18.2, 18.4, 18.3_

- [x] 2.1 Write property test for WCAG contrast compliance
  - **Property 5: WCAG Contrast Compliance**
  - **Validates: Requirements 2.7, 3.4**

- [x] 2.2 Write property test for currency formatting
  - **Property 34: Currency Formatting**
  - **Validates: Requirements 18.2**

- [x] 2.3 Write property test for percentage formatting
  - **Property 35: Percentage Formatting**
  - **Validates: Requirements 18.4**

- [x] 3. Implement Button component
  - Create `components/ui/Button.tsx` with variants (primary, secondary, outline, ghost, danger)
  - Support sizes (sm, md, lg) with appropriate padding and font sizes
  - Implement loading state with spinner icon
  - Implement disabled state with reduced opacity
  - Support icon-only, text-only, and icon-with-text configurations
  - Ensure minimum 44px touch target size
  - Add focus ring for keyboard navigation
  - Support fullWidth prop for mobile forms
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

- [x] 3.1 Write property test for Button variant rendering
  - **Property 7: Button Variant Rendering**
  - **Validates: Requirements 5.1**

- [x] 3.2 Write property test for Button size rendering
  - **Property 8: Button Size Rendering**
  - **Validates: Requirements 5.2**

- [x] 3.3 Write property test for Button loading state
  - **Property 9: Button Loading State**
  - **Validates: Requirements 5.3**

- [x] 3.4 Write property test for Button disabled state
  - **Property 10: Button Disabled State**
  - **Validates: Requirements 5.4**

- [x] 3.5 Write property test for Button icon configuration
  - **Property 11: Button Icon Configuration**
  - **Validates: Requirements 5.5**

- [x] 3.6 Write property test for Button full width
  - **Property 12: Button Full Width**
  - **Validates: Requirements 5.9**

- [x] 3.7 Write property test for touch target minimum size
  - **Property 6: Touch Target Minimum Size**
  - **Validates: Requirements 4.4, 5.8, 6.9, 8.8**

- [x] 4. Implement Input component
  - Create `components/ui/Input.tsx` with types (text, number, date, textarea, select)
  - Display label above input with required indicator (*)
  - Implement error state with red border, error icon, and error message
  - Implement success state with green border and checkmark icon
  - Support prefix and suffix icons (e.g., ₹ for currency)
  - Display placeholder text with reduced opacity
  - Support disabled state with gray background
  - Ensure minimum 44px height for touch targets
  - Support helper text below input
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10_

- [x] 4.1 Write property test for Input state rendering
  - **Property 13: Input State Rendering**
  - **Validates: Requirements 6.1, 6.3, 6.4**

- [x] 4.2 Write property test for Input label with required indicator
  - **Property 14: Input Label with Required Indicator**
  - **Validates: Requirements 6.2**

- [x] 4.3 Write property test for Input prefix and suffix
  - **Property 15: Input Prefix and Suffix**
  - **Validates: Requirements 6.6**

- [x] 4.4 Write property test for Input helper text
  - **Property 16: Input Helper Text**
  - **Validates: Requirements 6.10**

- [x] 5. Implement Card component
  - Create `components/ui/Card.tsx` with elevation levels (flat, raised, elevated)
  - Support density options (compact, comfortable)
  - Implement interactive variant with hover state
  - Create CardHeader, CardBody, CardFooter sub-components
  - Support loading state with skeleton placeholders
  - Use white background, subtle border, and rounded corners
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [x] 5.1 Write property test for Card elevation rendering
  - **Property 17: Card Elevation Rendering**
  - **Validates: Requirements 7.2**

- [x] 5.2 Write property test for Card interactive hover
  - **Property 18: Card Interactive Hover**
  - **Validates: Requirements 7.3**

- [x] 5.3 Write property test for Card loading state
  - **Property 19: Card Loading State**
  - **Validates: Requirements 7.7**

- [x] 5.4 Write property test for Card density rendering
  - **Property 20: Card Density Rendering**
  - **Validates: Requirements 7.8**

- [x] 6. Implement utility components (Skeleton, EmptyState, ErrorState, Spinner)
  - Create `components/ui/Skeleton.tsx` with variants (text, circular, rectangular) and pulse animation
  - Create `components/ui/EmptyState.tsx` with icon, title, description, and action button
  - Create `components/ui/ErrorState.tsx` with error icon, title, message, and recovery actions
  - Create `components/ui/Spinner.tsx` with sizes (sm, md, lg) and spin animation
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [x] 6.1 Write property test for loading component animation
  - **Property 23: Loading Component Animation**
  - **Validates: Requirements 9.5**

- [x] 7. Implement Badge and Progress components
  - Create `components/ui/Badge.tsx` with variants (default, success, warning, error, info)
  - Create `components/ui/Progress.tsx` with value (0-100), variants, sizes, and optional label
  - _Requirements: 8.5 (badge for navigation), 18.5 (progress for scores)_

- [x] 8. Implement Toast notification component
  - Create `components/ui/Toast.tsx` with types (success, error, warning, info)
  - Display in top-right corner with slide-in animation
  - Auto-dismiss after 3s (success/info) or 5s (error/warning)
  - Include close button for manual dismissal
  - Stack multiple toasts vertically with 8px gap
  - Support multi-language messages
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_

- [x] 8.1 Write property test for Toast type rendering
  - **Property 24: Toast Type Rendering**
  - **Validates: Requirements 12.2**

- [x] 8.2 Write property test for Toast auto-dismiss
  - **Property 25: Toast Auto-Dismiss**
  - **Validates: Requirements 12.3**

- [x] 9. Checkpoint - Ensure all base component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Header navigation component
  - Create `components/ui/Navigation/Header.tsx` with sticky positioning
  - Display app title, language selector, and sync status
  - Support left action (menu button) and right actions (user actions)
  - Ensure minimum 44px touch target for all interactive elements
  - _Requirements: 8.1, 8.8_

- [x] 11. Implement Sidebar navigation component
  - Create `components/ui/Navigation/Sidebar.tsx` for desktop (240px width)
  - Display section icons and labels with active state highlighting
  - Show badge with count for pending items
  - Support keyboard navigation with arrow keys
  - Display user profile section at bottom
  - Use semantic HTML (aside, nav elements)
  - _Requirements: 8.2, 8.4, 8.5, 8.6, 8.7, 8.8_

- [x] 11.1 Write property test for navigation active state
  - **Property 21: Navigation Active State**
  - **Validates: Requirements 8.4**

- [x] 11.2 Write property test for navigation badge display
  - **Property 22: Navigation Badge Display**
  - **Validates: Requirements 8.5**

- [x] 12. Implement MobileNav navigation component
  - Create `components/ui/Navigation/MobileNav.tsx` for mobile (fixed bottom)
  - Display horizontal navigation with icons and labels
  - Show badge with count for pending items (max 9+)
  - Highlight active section with primary color
  - Ensure minimum 44px touch target for all items
  - _Requirements: 8.3, 8.4, 8.5, 8.8_

- [x] 12.1 Write property test for component keyboard accessibility
  - **Property 27: Component Keyboard Accessibility**
  - **Validates: Requirements 14.2**

- [x] 12.2 Write property test for component ARIA labels
  - **Property 28: Component ARIA Labels**
  - **Validates: Requirements 14.3**

- [x] 12.3 Write property test for semantic HTML elements
  - **Property 29: Semantic HTML Elements**
  - **Validates: Requirements 14.4**

- [x] 12.4 Write property test for component ARIA attributes
  - **Property 31: Component ARIA Attributes**
  - **Validates: Requirements 14.6**

- [x] 13. Checkpoint - Ensure all navigation component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Update global styles and font configuration
  - Update `app/globals.css` with Tailwind imports and custom styles
  - Add Noto Sans Devanagari font from Google Fonts
  - Configure font-display: swap for performance
  - Add CSS custom properties for design tokens
  - Ensure minimum 16px base font size on mobile
  - _Requirements: 2.1, 2.3, 2.4, 19.8_

- [x] 15. Update DailyEntryForm to use new design system
  - Replace existing form inputs with new Input component
  - Replace existing buttons with new Button component
  - Use Card component for form container
  - Add loading states with Spinner component
  - Add error states with ErrorState component
  - Ensure all components follow Vyapar rules (no business logic in UI)
  - _Requirements: 5.x, 6.x, 7.x, 9.x, 11.x_

- [x] 16. Update FollowUpPanel to use new design system
  - Replace existing card layout with new Card component
  - Replace existing buttons with new Button component
  - Use Badge component for overdue indicators
  - Add EmptyState component when no overdue credits
  - Add ErrorState component for error handling
  - _Requirements: 7.x, 5.x, 10.x, 11.x_

- [x] 17. Update DailySuggestionCard to use new design system
  - Replace existing card with new Card component
  - Use Badge component for severity indicators (info, warning, critical)
  - Replace buttons with new Button component
  - Add appropriate icons from lucide-react
  - _Requirements: 7.x, 5.x_

- [x] 18. Update IndicesDashboard to use new design system
  - Replace existing cards with new Card component
  - Use Progress component for stress and affordability indices
  - Use financial color utilities (getFinancialColor, getFinancialBgColor)
  - Add TrendingUp/TrendingDown icons alongside colors for accessibility
  - Format currency with formatCurrency utility
  - Format percentages with formatPercentage utility
  - _Requirements: 7.x, 18.1, 18.2, 18.3, 18.4, 18.5_

- [x] 18.1 Write property test for financial data color with icons
  - **Property 30: Financial Data Color with Icons**
  - **Validates: Requirements 14.5**

- [x] 19. Update BenchmarkDisplay to use new design system
  - Replace existing card with new Card component
  - Use Badge component for performance indicators (Above/At/Below average)
  - Format numbers with formatCurrency and formatPercentage utilities
  - _Requirements: 7.x, 18.2, 18.4_

- [x] 20. Update InsightsDisplay to use new design system
  - Replace existing card with new Card component
  - Use Skeleton component for loading states
  - Use ErrorState component for error handling
  - Replace buttons with new Button component
  - _Requirements: 7.x, 9.x, 11.x, 5.x_

- [x] 21. Update PendingTransactionConfirmation to use new design system
  - Replace existing card with new Card component
  - Replace buttons with new Button component (Add, Later, Discard)
  - Use Badge component for transaction type indicators
  - Format currency with formatCurrency utility
  - _Requirements: 7.x, 5.x, 18.2_

- [x] 22. Update authentication forms to use new design system
  - Update LoginForm and SignupForm with new Input and Button components
  - Use Card component for form containers
  - Add loading states with Spinner component
  - Add error states with inline error messages
  - Ensure minimum 44px touch targets on mobile
  - _Requirements: 5.x, 6.x, 7.x, 9.x, 11.x_

- [x] 23. Implement responsive layout system
  - Update page layouts to use mobile-first approach (320px → tablet → desktop)
  - Implement Header component in all pages
  - Implement Sidebar component for desktop layouts
  - Implement MobileNav component for mobile layouts
  - Test layouts at all breakpoints (320px, 375px, 414px, 768px, 1024px, 1280px, 1920px)
  - Use relative units (rem, em, %) instead of fixed pixels
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_

- [x] 23.1 Write property test for spacing relative units
  - **Property 26: Spacing Relative Units**
  - **Validates: Requirements 13.6**

- [x] 24. Implement PWA UI patterns
  - Update PWAInstallPrompt component with new design system
  - Update PWAUpdateNotification component with new design system
  - Add offline indicator in Header component
  - Add sync status indicator in Header component
  - Create offline fallback page with ErrorState component
  - Use theme color (primary blue) for browser UI
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8_

- [x] 25. Checkpoint - Ensure all component updates are complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 26. Implement animation system
  - Add animation duration tokens to Tailwind config (fast: 150ms, base: 300ms, slow: 500ms)
  - Add animation easing tokens (ease-in, ease-out, ease-in-out)
  - Implement button click micro-interaction (scale 0.98 for 100ms)
  - Implement card hover animation (shadow and border color transition)
  - Implement content fade-in animation (opacity 0 to 1, 300ms)
  - Implement modal open animation (scale 0.95 to 1, opacity 0 to 1, 200ms)
  - Add prefers-reduced-motion media query support
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8_

- [x] 26.1 Write property test for animation duration tokens
  - **Property 32: Animation Duration Tokens**
  - **Validates: Requirements 15.1, 15.8**

- [x] 26.2 Write property test for animation easing tokens
  - **Property 33: Animation Easing Tokens**
  - **Validates: Requirements 15.2**

- [x] 26.3 Write property test for animation performance
  - **Property 36: Animation Performance**
  - **Validates: Requirements 19.4**

- [x] 27. Implement multi-language support for UI components
  - Add translation keys for all new UI components (Button, Input, Card, Toast, etc.)
  - Update translations.ts with English, Hindi, and Marathi translations
  - Ensure Devanagari font is applied for Hindi and Marathi text
  - Adjust line heights for Devanagari script readability
  - Test text expansion handling (Hindi/Marathi may be 20-30% longer)
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8_

- [x] 28. Implement accessibility compliance
  - Run jest-axe tests on all new components
  - Ensure all interactive elements have visible focus indicators
  - Add alternative text for all icons using aria-label
  - Verify semantic HTML structure (header, nav, main, section, article, footer)
  - Ensure color is not the only means of conveying information
  - Add skip navigation links for keyboard users
  - Ensure form inputs have associated labels
  - Test browser zoom up to 200%
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 14.10_

- [x] 29. Implement performance optimizations
  - Lazy load images and heavy components below the fold
  - Use CSS transforms for animations instead of layout properties
  - Minimize JavaScript bundle size with code splitting
  - Use memoization for expensive component renders
  - Debounce user input handlers (300ms delay)
  - Optimize font loading with font-display: swap
  - Test FCP < 1.5s and TTI < 3s on low-end devices
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8_

- [x] 30. Final checkpoint - Run all tests and verify implementation
  - Run all unit tests (Jest + React Testing Library)
  - Run all property-based tests (fast-check) - verify all 36 properties pass
  - Run accessibility tests (jest-axe)
  - Run visual regression tests (Jest snapshots)
  - Run TypeScript type checking
  - Run ESLint linting
  - Test on multiple devices and browsers
  - Verify offline functionality
  - Verify multi-language support
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- All 36 correctness properties have corresponding property-based test tasks
- Checkpoints ensure incremental validation at key milestones
- Property tests use fast-check library with minimum 100 iterations
- Unit tests and property tests are complementary - both are needed for comprehensive coverage
- All UI components must be pure presentation components (no business logic per Vyapar rules)
- Design system must support offline-first architecture
- Mobile-first responsive design (320px → tablet → desktop)
- WCAG 2.1 AA accessibility compliance is mandatory
- Performance budget: FCP < 1.5s, TTI < 3s on low-end devices
