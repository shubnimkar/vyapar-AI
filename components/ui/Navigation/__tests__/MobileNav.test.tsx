/**
 * Unit Tests for MobileNav Component
 * 
 * Tests specific examples and edge cases for the MobileNav component.
 * Complements property-based tests with concrete scenarios.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md for complete specifications
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MobileNav } from '../MobileNav';
import { Home, CreditCard, FileText, Settings } from 'lucide-react';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('MobileNav Component', () => {
  const mockItems = [
    { label: 'Home', href: '/', icon: <Home /> },
    { label: 'Credits', href: '/credits', icon: <CreditCard />, badge: 3 },
    { label: 'Reports', href: '/reports', icon: <FileText /> },
    { label: 'Settings', href: '/settings', icon: <Settings />, badge: 12 },
  ];

  describe('Rendering', () => {
    it('should render all navigation items', () => {
      const { container } = render(<MobileNav items={mockItems} />);
      
      const links = container.querySelectorAll('a');
      expect(links).toHaveLength(4);
    });

    it('should render navigation labels', () => {
      render(<MobileNav items={mockItems} />);
      
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Credits')).toBeInTheDocument();
      expect(screen.getByText('Reports')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(<MobileNav items={mockItems} className="custom-class" />);
      
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('custom-class');
    });
  });

  describe('Active State', () => {
    it('should highlight active navigation item', () => {
      const { container } = render(<MobileNav items={mockItems} />);
      
      const homeLink = container.querySelector('a[href="/"]');
      expect(homeLink).toHaveClass('text-primary-600');
      expect(homeLink).toHaveAttribute('aria-current', 'page');
    });

    it('should not highlight inactive navigation items', () => {
      const { container } = render(<MobileNav items={mockItems} />);
      
      const creditsLink = container.querySelector('a[href="/credits"]');
      expect(creditsLink).toHaveClass('text-neutral-600');
      expect(creditsLink).not.toHaveAttribute('aria-current');
    });
  });

  describe('Badge Display', () => {
    it('should display badge for items with badge count', () => {
      const { container } = render(<MobileNav items={mockItems} />);
      
      // Credits has badge: 3
      const creditsLink = container.querySelector('a[href="/credits"]');
      const badge = creditsLink?.querySelector('.bg-warning-500');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('3');
    });

    it('should display "9+" for badges greater than 9', () => {
      const { container } = render(<MobileNav items={mockItems} />);
      
      // Settings has badge: 12
      const settingsLink = container.querySelector('a[href="/settings"]');
      const badge = settingsLink?.querySelector('.bg-warning-500');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('9+');
    });

    it('should not display badge for items without badge', () => {
      const { container } = render(<MobileNav items={mockItems} />);
      
      // Home has no badge
      const homeLink = container.querySelector('a[href="/"]');
      const badge = homeLink?.querySelector('.bg-warning-500');
      expect(badge).not.toBeInTheDocument();
    });

    it('should not display badge for items with badge count of 0', () => {
      const itemsWithZeroBadge = [
        { label: 'Home', href: '/', icon: <Home />, badge: 0 },
      ];
      
      const { container } = render(<MobileNav items={itemsWithZeroBadge} />);
      
      const homeLink = container.querySelector('a[href="/"]');
      const badge = homeLink?.querySelector('.bg-warning-500');
      expect(badge).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have semantic nav element', () => {
      const { container } = render(<MobileNav items={mockItems} />);
      
      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveAttribute('role', 'navigation');
      expect(nav).toHaveAttribute('aria-label', 'Mobile navigation');
    });

    it('should have aria-label on all links', () => {
      const { container } = render(<MobileNav items={mockItems} />);
      
      const links = container.querySelectorAll('a');
      links.forEach((link) => {
        expect(link).toHaveAttribute('aria-label');
      });
    });

    it('should include badge count in aria-label', () => {
      const { container } = render(<MobileNav items={mockItems} />);
      
      const creditsLink = container.querySelector('a[href="/credits"]');
      expect(creditsLink).toHaveAttribute('aria-label', 'Credits (3 pending)');
      
      const settingsLink = container.querySelector('a[href="/settings"]');
      expect(settingsLink).toHaveAttribute('aria-label', 'Settings (9+ pending)');
    });

    it('should have aria-hidden on badge visual indicator', () => {
      const { container } = render(<MobileNav items={mockItems} />);
      
      const badges = container.querySelectorAll('.bg-warning-500');
      badges.forEach((badge) => {
        expect(badge).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('should have focus ring classes for keyboard navigation', () => {
      const { container } = render(<MobileNav items={mockItems} />);
      
      const links = container.querySelectorAll('a');
      links.forEach((link) => {
        expect(link).toHaveClass('focus:outline-none');
        expect(link).toHaveClass('focus:ring-2');
        expect(link).toHaveClass('focus:ring-primary-500');
      });
    });

    it('should have minimum 44px touch target', () => {
      const { container } = render(<MobileNav items={mockItems} />);
      
      const links = container.querySelectorAll('a');
      links.forEach((link) => {
        expect(link).toHaveClass('min-h-[44px]');
      });
    });
  });

  describe('Responsive Design', () => {
    it('should be hidden on desktop', () => {
      const { container } = render(<MobileNav items={mockItems} />);
      
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('desktop:hidden');
    });

    it('should be fixed at bottom', () => {
      const { container } = render(<MobileNav items={mockItems} />);
      
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('fixed');
      expect(nav).toHaveClass('bottom-0');
      expect(nav).toHaveClass('left-0');
      expect(nav).toHaveClass('right-0');
    });

    it('should have high z-index for layering', () => {
      const { container } = render(<MobileNav items={mockItems} />);
      
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('z-40');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single navigation item', () => {
      const singleItem = [{ label: 'Home', href: '/', icon: <Home /> }];
      
      const { container } = render(<MobileNav items={singleItem} />);
      
      const links = container.querySelectorAll('a');
      expect(links).toHaveLength(1);
    });

    it('should handle many navigation items', () => {
      const manyItems = [
        { label: 'Home', href: '/', icon: <Home /> },
        { label: 'Credits', href: '/credits', icon: <CreditCard /> },
        { label: 'Reports', href: '/reports', icon: <FileText /> },
        { label: 'Settings', href: '/settings', icon: <Settings /> },
        { label: 'Profile', href: '/profile', icon: <Home /> },
        { label: 'Help', href: '/help', icon: <Home /> },
      ];
      
      const { container } = render(<MobileNav items={manyItems} />);
      
      const links = container.querySelectorAll('a');
      expect(links).toHaveLength(6);
    });

    it('should handle long labels with truncation', () => {
      const longLabelItems = [
        { label: 'Very Long Navigation Label', href: '/', icon: <Home /> },
      ];
      
      const { container } = render(<MobileNav items={longLabelItems} />);
      
      const label = screen.getByText('Very Long Navigation Label');
      expect(label).toHaveClass('truncate');
      expect(label).toHaveClass('max-w-[60px]');
    });
  });
});
