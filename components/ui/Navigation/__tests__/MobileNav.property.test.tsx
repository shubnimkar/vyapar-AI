/**
 * Property-Based Tests for MobileNav Component
 * 
 * Tests universal properties that should hold across all valid inputs.
 * Uses fast-check for property-based testing with minimum 100 iterations.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md - Properties 27, 28, 29, 31
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MobileNav, NavItem } from '../MobileNav';
import * as fc from 'fast-check';
import { Home, CreditCard, FileText, Settings, User } from 'lucide-react';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

// Icon pool for generating nav items
const iconPool = [
  <Home key="home" />,
  <CreditCard key="credit" />,
  <FileText key="file" />,
  <Settings key="settings" />,
  <User key="user" />,
];

/**
 * Arbitrary generator for NavItem
 * Generates valid navigation items with random properties
 */
const navItemArbitrary = fc.record({
  label: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // Non-empty label
  href: fc.webPath().filter(path => path.length > 0), // Ensure non-empty href
  icon: fc.constantFrom(...iconPool),
  badge: fc.option(fc.nat({ max: 20 }), { nil: undefined }),
});

/**
 * Arbitrary generator for array of NavItems
 * Generates 1-6 navigation items (typical mobile nav size)
 */
const navItemsArbitrary = fc.array(navItemArbitrary, { minLength: 1, maxLength: 6 });

describe('MobileNav Property-Based Tests', () => {
  /**
   * Feature: ui-ux-redesign, Property 27: Component Keyboard Accessibility
   * 
   * For any interactive component (Button, Input, navigation items), the component
   * SHALL have focus:ring classes for visible focus indicators.
   * 
   * Validates: Requirements 14.2
   */
  describe('Property 27: Component Keyboard Accessibility', () => {
    it('should have focus ring classes on all navigation links', () => {
      fc.assert(
        fc.property(navItemsArbitrary, (items) => {
          const { container } = render(<MobileNav items={items} />);
          
          // Get all navigation links
          const links = container.querySelectorAll('a');
          
          // Verify each link has focus ring classes
          links.forEach((link) => {
            const classes = link.className;
            
            // Check for focus:outline-none (removes default outline)
            expect(classes).toContain('focus:outline-none');
            
            // Check for focus:ring-2 (visible focus indicator)
            expect(classes).toContain('focus:ring-2');
            
            // Check for focus:ring-primary-500 (primary color ring)
            expect(classes).toContain('focus:ring-primary-500');
            
            // Check for focus:ring-offset-2 (ring offset for visibility)
            expect(classes).toContain('focus:ring-offset-2');
          });
        }),
        { numRuns: 100 }
      );
    });

    it('should have keyboard-accessible navigation links', () => {
      fc.assert(
        fc.property(navItemsArbitrary, (items) => {
          const { container } = render(<MobileNav items={items} />);
          
          // Get all navigation links
          const links = container.querySelectorAll('a');
          
          // Verify each link is keyboard accessible (has href and is focusable)
          links.forEach((link) => {
            // Link should have href attribute
            expect(link).toHaveAttribute('href');
            
            // Link should not have tabindex=-1 (which would make it unfocusable)
            expect(link).not.toHaveAttribute('tabindex', '-1');
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: ui-ux-redesign, Property 28: Component ARIA Labels
   * 
   * For any icon-only interactive element, the component SHALL have an
   * aria-label attribute for screen reader accessibility.
   * 
   * Validates: Requirements 14.3
   */
  describe('Property 28: Component ARIA Labels', () => {
    it('should have aria-label on all navigation links', () => {
      fc.assert(
        fc.property(navItemsArbitrary, (items) => {
          const { container } = render(<MobileNav items={items} />);
          
          // Get all links
          const links = container.querySelectorAll('a');
          
          // Verify each link has aria-label
          expect(links.length).toBe(items.length);
          links.forEach((link, index) => {
            expect(link).toHaveAttribute('aria-label');
            const ariaLabel = link.getAttribute('aria-label');
            expect(ariaLabel).toContain(items[index].label);
          });
        }),
        { numRuns: 100 }
      );
    });

    it('should include badge count in aria-label when badge is present', () => {
      fc.assert(
        fc.property(navItemsArbitrary, (items) => {
          const { container } = render(<MobileNav items={items} />);
          
          // Get all links
          const links = container.querySelectorAll('a');
          
          // Check items with badges
          items.forEach((item, index) => {
            if (item.badge !== undefined && item.badge > 0) {
              const link = links[index];
              const ariaLabel = link.getAttribute('aria-label');
              
              // aria-label should include badge count information
              expect(ariaLabel).toContain('pending');
              
              // Should show "9+" for badges > 9, otherwise the actual count
              if (item.badge > 9) {
                expect(ariaLabel).toContain('9+');
              } else {
                expect(ariaLabel).toContain(item.badge.toString());
              }
            }
          });
        }),
        { numRuns: 100 }
      );
    });

    it('should have aria-label on navigation container', () => {
      fc.assert(
        fc.property(navItemsArbitrary, (items) => {
          const { container } = render(<MobileNav items={items} />);
          
          // Find the nav element
          const nav = container.querySelector('nav');
          
          // Nav should have aria-label
          expect(nav).toHaveAttribute('aria-label');
          expect(nav?.getAttribute('aria-label')).toBe('Mobile navigation');
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: ui-ux-redesign, Property 29: Semantic HTML Elements
   * 
   * For any navigation component (Header, Sidebar, MobileNav), the component
   * SHALL render semantic HTML elements (header, nav, aside).
   * 
   * Validates: Requirements 14.4
   */
  describe('Property 29: Semantic HTML Elements', () => {
    it('should use semantic nav element', () => {
      fc.assert(
        fc.property(navItemsArbitrary, (items) => {
          const { container } = render(<MobileNav items={items} />);
          
          // Should have a nav element
          const nav = container.querySelector('nav');
          expect(nav).toBeInTheDocument();
          
          // Nav should have role="navigation"
          expect(nav).toHaveAttribute('role', 'navigation');
        }),
        { numRuns: 100 }
      );
    });

    it('should use semantic link elements for navigation items', () => {
      fc.assert(
        fc.property(navItemsArbitrary, (items) => {
          const { container } = render(<MobileNav items={items} />);
          
          // All navigation items should be links (a elements)
          const links = container.querySelectorAll('a');
          expect(links.length).toBe(items.length);
          
          // Each link should have href attribute
          links.forEach((link) => {
            expect(link).toHaveAttribute('href');
          });
        }),
        { numRuns: 100 }
      );
    });

    it('should not use div or span for interactive navigation items', () => {
      fc.assert(
        fc.property(navItemsArbitrary, (items) => {
          const { container } = render(<MobileNav items={items} />);
          
          // Find all elements with click handlers or href
          const nav = container.querySelector('nav');
          const clickableDivs = nav?.querySelectorAll('div[onclick], div[role="button"]');
          const clickableSpans = nav?.querySelectorAll('span[onclick], span[role="button"]');
          
          // Should not use div or span as clickable navigation items
          expect(clickableDivs?.length || 0).toBe(0);
          expect(clickableSpans?.length || 0).toBe(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: ui-ux-redesign, Property 31: Component ARIA Attributes
   * 
   * For any interactive component, the component SHALL have appropriate ARIA
   * attributes (role, aria-label, aria-disabled) when needed.
   * 
   * Validates: Requirements 14.6
   */
  describe('Property 31: Component ARIA Attributes', () => {
    it('should have role="navigation" on nav element', () => {
      fc.assert(
        fc.property(navItemsArbitrary, (items) => {
          const { container } = render(<MobileNav items={items} />);
          
          const nav = container.querySelector('nav');
          expect(nav).toHaveAttribute('role', 'navigation');
        }),
        { numRuns: 100 }
      );
    });

    it('should have aria-current="page" on active navigation item', () => {
      fc.assert(
        fc.property(navItemsArbitrary, (items) => {
          // Ensure at least one item matches the current path
          const itemsWithHome = [{ ...items[0], href: '/' }, ...items.slice(1)];
          
          const { container } = render(<MobileNav items={itemsWithHome} />);
          
          // Find the active link (href="/")
          const activeLink = container.querySelector('a[href="/"]');
          
          // Active link should have aria-current="page"
          expect(activeLink).toHaveAttribute('aria-current', 'page');
        }),
        { numRuns: 100 }
      );
    });

    it('should have aria-hidden="true" on badge visual indicator', () => {
      fc.assert(
        fc.property(navItemsArbitrary, (items) => {
          const { container } = render(<MobileNav items={items} />);
          
          // Find all badge elements
          const badges = container.querySelectorAll('.bg-warning-500');
          
          // Each badge should have aria-hidden="true" (since count is in aria-label)
          badges.forEach((badge) => {
            expect(badge).toHaveAttribute('aria-hidden', 'true');
          });
        }),
        { numRuns: 100 }
      );
    });

    it('should not have aria-current on inactive navigation items', () => {
      fc.assert(
        fc.property(navItemsArbitrary, (items) => {
          // Ensure items don't match current path
          const itemsWithoutHome = items.map(item => ({
            ...item,
            href: item.href === '/' ? '/other' : item.href
          }));
          
          const { container } = render(<MobileNav items={itemsWithoutHome} />);
          
          // Find all links
          const links = container.querySelectorAll('a');
          
          // No link should have aria-current
          links.forEach((link) => {
            expect(link).not.toHaveAttribute('aria-current');
          });
        }),
        { numRuns: 100 }
      );
    });

    it('should have appropriate ARIA attributes for accessibility', () => {
      fc.assert(
        fc.property(navItemsArbitrary, (items) => {
          const { container } = render(<MobileNav items={items} />);
          
          // Nav should have role and aria-label
          const nav = container.querySelector('nav');
          expect(nav).toHaveAttribute('role', 'navigation');
          expect(nav).toHaveAttribute('aria-label');
          
          // All links should have aria-label
          const links = container.querySelectorAll('a');
          links.forEach((link) => {
            expect(link).toHaveAttribute('aria-label');
          });
        }),
        { numRuns: 100 }
      );
    });
  });
});
