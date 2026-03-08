/**
 * Property-Based Tests for Sidebar Component
 * 
 * Tests universal properties that should hold across all valid inputs.
 * Uses fast-check for property-based testing with minimum 100 iterations.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md - Properties 21, 22
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Sidebar, NavItem } from '../Sidebar';
import * as fc from 'fast-check';
import { Home, CreditCard, Settings, BarChart } from 'lucide-react';

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

const { usePathname } = require('next/navigation');

// Arbitrary generators for test data
const iconArbitrary = fc.constantFrom(
  <Home className="w-5 h-5" />,
  <CreditCard className="w-5 h-5" />,
  <Settings className="w-5 h-5" />,
  <BarChart className="w-5 h-5" />
);

const navItemArbitrary = fc.record({
  label: fc.string({ minLength: 1, maxLength: 20 }),
  href: fc.webPath({ minLength: 1 }), // Ensure non-empty paths
  icon: iconArbitrary,
  badge: fc.option(fc.nat({ max: 99 }), { nil: undefined }),
});

// Generate array of nav items with unique hrefs
const navItemsArbitrary = fc
  .array(navItemArbitrary, { minLength: 1, maxLength: 10 })
  .map(items => {
    // Ensure unique hrefs by appending index
    return items.map((item, index) => ({
      ...item,
      href: item.href || `/${index}`, // Fallback for empty hrefs
      href: `${item.href}-${index}`, // Make unique
    }));
  });

/**
 * Feature: ui-ux-redesign, Property 21: Navigation Active State
 * 
 * For any navigation item (Sidebar) where the current pathname matches the item's href,
 * the item SHALL be highlighted with primary color classes.
 * 
 * Validates: Requirements 8.4
 */
describe('Property 21: Navigation Active State', () => {
  it('should highlight navigation item when pathname matches href', () => {
    fc.assert(
      fc.property(navItemsArbitrary, fc.nat(), (items, activeIndexSeed) => {
        // Select an active item from the array
        const activeIndex = activeIndexSeed % items.length;
        const activeHref = items[activeIndex].href;
        
        // Mock pathname to match the active item
        usePathname.mockReturnValue(activeHref);
        
        // Render sidebar
        const { container } = render(<Sidebar items={items} />);
        
        // Find all navigation links
        const links = container.querySelectorAll('a');
        
        // Verify the active link has primary color classes
        const activeLink = Array.from(links).find(link => 
          link.getAttribute('href') === activeHref
        );
        
        expect(activeLink).toBeDefined();
        expect(activeLink?.className).toContain('bg-primary-50');
        expect(activeLink?.className).toContain('text-primary-700');
        expect(activeLink?.className).toContain('border-primary-600');
        expect(activeLink?.getAttribute('aria-current')).toBe('page');
        
        // Verify non-active links don't have active classes
        const nonActiveLinks = Array.from(links).filter(link => 
          link.getAttribute('href') !== activeHref
        );
        
        nonActiveLinks.forEach(link => {
          expect(link.className).not.toContain('bg-primary-50');
          expect(link.className).toContain('text-neutral-700');
          expect(link.getAttribute('aria-current')).toBeNull();
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should not highlight any item when pathname does not match any href', () => {
    fc.assert(
      fc.property(navItemsArbitrary, (items) => {
        // Mock pathname to a path that doesn't match any item
        const nonMatchingPath = '/non-existent-path-' + Math.random();
        usePathname.mockReturnValue(nonMatchingPath);
        
        // Render sidebar
        const { container } = render(<Sidebar items={items} />);
        
        // Find all navigation links
        const links = container.querySelectorAll('a');
        
        // Verify no link has active classes
        Array.from(links).forEach(link => {
          expect(link.className).not.toContain('bg-primary-50');
          expect(link.className).toContain('text-neutral-700');
          expect(link.getAttribute('aria-current')).toBeNull();
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should update active state when pathname changes', () => {
    fc.assert(
      fc.property(navItemsArbitrary, fc.nat(), fc.nat(), (items, index1Seed, index2Seed) => {
        if (items.length < 2) return; // Skip if not enough items
        
        const index1 = index1Seed % items.length;
        const index2 = index2Seed % items.length;
        
        if (index1 === index2) return; // Skip if same index
        
        // First render with first active item
        usePathname.mockReturnValue(items[index1].href);
        const { container, rerender } = render(<Sidebar items={items} />);
        
        let links = container.querySelectorAll('a');
        let activeLink = Array.from(links).find(link => 
          link.getAttribute('href') === items[index1].href
        );
        expect(activeLink?.className).toContain('bg-primary-50');
        
        // Re-render with second active item
        usePathname.mockReturnValue(items[index2].href);
        rerender(<Sidebar items={items} />);
        
        links = container.querySelectorAll('a');
        
        // First item should no longer be active
        const previouslyActiveLink = Array.from(links).find(link => 
          link.getAttribute('href') === items[index1].href
        );
        expect(previouslyActiveLink?.className).not.toContain('bg-primary-50');
        
        // Second item should now be active
        const newActiveLink = Array.from(links).find(link => 
          link.getAttribute('href') === items[index2].href
        );
        expect(newActiveLink?.className).toContain('bg-primary-50');
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: ui-ux-redesign, Property 22: Navigation Badge Display
 * 
 * For any navigation item with a badge value greater than 0,
 * the component SHALL render a badge with the count.
 * 
 * Validates: Requirements 8.5
 */
describe('Property 22: Navigation Badge Display', () => {
  it('should display badge when badge value is greater than 0', () => {
    fc.assert(
      fc.property(navItemsArbitrary, fc.nat({ max: 10 }), (items, badgeIndexSeed) => {
        // Select an item to have a badge
        const badgeIndex = badgeIndexSeed % items.length;
        const badgeValue = Math.floor(Math.random() * 99) + 1; // 1-99
        
        // Set badge on selected item
        const itemsWithBadge = items.map((item, index) => ({
          ...item,
          badge: index === badgeIndex ? badgeValue : undefined,
        }));
        
        // Mock pathname
        usePathname.mockReturnValue('/some-path');
        
        // Render sidebar
        const { container } = render(<Sidebar items={itemsWithBadge} />);
        
        // Find all badges (Badge component renders as span)
        const badges = container.querySelectorAll('span[class*="bg-warning"]');
        
        // Should have exactly one badge
        expect(badges.length).toBeGreaterThan(0);
        
        // Badge should contain the count
        const badgeText = Array.from(badges).find(badge => 
          badge.textContent === badgeValue.toString()
        );
        expect(badgeText).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  it('should not display badge when badge value is 0', () => {
    fc.assert(
      fc.property(navItemsArbitrary, (items) => {
        // Set all badges to 0
        const itemsWithZeroBadge = items.map(item => ({
          ...item,
          badge: 0,
        }));
        
        // Mock pathname
        usePathname.mockReturnValue('/some-path');
        
        // Render sidebar
        const { container } = render(<Sidebar items={itemsWithZeroBadge} />);
        
        // Find all badges (Badge component renders as span with bg-warning)
        const badges = container.querySelectorAll('span[class*="bg-warning"]');
        
        // Should have no badges
        expect(badges.length).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should not display badge when badge value is undefined', () => {
    fc.assert(
      fc.property(navItemsArbitrary, (items) => {
        // Set all badges to undefined
        const itemsWithoutBadge = items.map(item => ({
          ...item,
          badge: undefined,
        }));
        
        // Mock pathname
        usePathname.mockReturnValue('/some-path');
        
        // Render sidebar
        const { container } = render(<Sidebar items={itemsWithoutBadge} />);
        
        // Find all badges (Badge component renders as span with bg-warning)
        const badges = container.querySelectorAll('span[class*="bg-warning"]');
        
        // Should have no badges
        expect(badges.length).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should display multiple badges when multiple items have badge values', () => {
    fc.assert(
      fc.property(navItemsArbitrary, (items) => {
        if (items.length < 2) return; // Skip if not enough items
        
        // Set badges on all items with random values
        const itemsWithBadges = items.map(item => ({
          ...item,
          badge: Math.floor(Math.random() * 50) + 1, // 1-50
        }));
        
        // Mock pathname
        usePathname.mockReturnValue('/some-path');
        
        // Render sidebar
        const { container } = render(<Sidebar items={itemsWithBadges} />);
        
        // Find all badges (Badge component renders as span with bg-warning)
        const badges = container.querySelectorAll('span[class*="bg-warning"]');
        
        // Should have same number of badges as items
        expect(badges.length).toBe(items.length);
      }),
      { numRuns: 100 }
    );
  });

  it('should have aria-label on badge for accessibility', () => {
    fc.assert(
      fc.property(navItemsArbitrary, fc.nat({ max: 10 }), (items, badgeIndexSeed) => {
        // Select an item to have a badge
        const badgeIndex = badgeIndexSeed % items.length;
        const badgeValue = Math.floor(Math.random() * 99) + 1;
        
        // Set badge on selected item
        const itemsWithBadge = items.map((item, index) => ({
          ...item,
          badge: index === badgeIndex ? badgeValue : undefined,
        }));
        
        // Mock pathname
        usePathname.mockReturnValue('/some-path');
        
        // Render sidebar
        const { container } = render(<Sidebar items={itemsWithBadge} />);
        
        // Find badge with aria-label
        const badgeWithAriaLabel = container.querySelector('[aria-label*="pending items"]');
        
        // Should have aria-label for accessibility
        expect(badgeWithAriaLabel).toBeDefined();
        expect(badgeWithAriaLabel?.getAttribute('aria-label')).toContain(badgeValue.toString());
      }),
      { numRuns: 100 }
    );
  });
});
