/**
 * Header Component Tests
 * 
 * Unit tests for the Header navigation component.
 * Validates rendering, accessibility, and interaction behavior.
 * 
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Header } from '../Header';

describe('Header Component', () => {
  describe('Basic Rendering', () => {
    it('renders title correctly', () => {
      render(<Header title="Test App" />);
      expect(screen.getByText('Test App')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test App');
    });

    it('applies sticky positioning', () => {
      const { container } = render(<Header title="Test" />);
      const header = container.querySelector('header');
      expect(header).toHaveClass('sticky', 'top-0');
    });

    it('applies custom className', () => {
      const { container } = render(<Header title="Test" className="custom-class" />);
      const header = container.querySelector('header');
      expect(header).toHaveClass('custom-class');
    });
  });

  describe('Menu Button', () => {
    it('renders menu button when onMenuClick is provided', () => {
      const handleMenuClick = jest.fn();
      render(<Header title="Test" onMenuClick={handleMenuClick} />);
      
      const menuButton = screen.getByRole('button', { name: /open menu/i });
      expect(menuButton).toBeInTheDocument();
    });

    it('does not render menu button when onMenuClick is not provided', () => {
      render(<Header title="Test" />);
      
      const menuButton = screen.queryByRole('button', { name: /open menu/i });
      expect(menuButton).not.toBeInTheDocument();
    });

    it('calls onMenuClick when menu button is clicked', async () => {
      const user = userEvent.setup();
      const handleMenuClick = jest.fn();
      render(<Header title="Test" onMenuClick={handleMenuClick} />);
      
      const menuButton = screen.getByRole('button', { name: /open menu/i });
      await user.click(menuButton);
      
      expect(handleMenuClick).toHaveBeenCalledTimes(1);
    });

    it('menu button has minimum 44px touch target', () => {
      const handleMenuClick = jest.fn();
      render(<Header title="Test" onMenuClick={handleMenuClick} />);
      
      const menuButton = screen.getByRole('button', { name: /open menu/i });
      expect(menuButton).toHaveClass('min-w-[44px]', 'min-h-[44px]');
    });

    it('menu button is hidden on desktop', () => {
      const handleMenuClick = jest.fn();
      render(<Header title="Test" onMenuClick={handleMenuClick} />);
      
      const menuButton = screen.getByRole('button', { name: /open menu/i });
      expect(menuButton).toHaveClass('desktop:hidden');
    });
  });

  describe('Left Action', () => {
    it('renders custom left action', () => {
      const leftAction = <button>Back</button>;
      render(<Header title="Test" leftAction={leftAction} />);
      
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    it('does not render left action section when not provided', () => {
      const { container } = render(<Header title="Test" />);
      
      // Only title should be in the left section
      const leftSection = container.querySelector('.flex.items-center.gap-3');
      expect(leftSection?.children.length).toBe(1); // Only title
    });
  });

  describe('Right Actions', () => {
    it('renders custom right actions', () => {
      const rightActions = (
        <>
          <button>Language</button>
          <button>Sync</button>
        </>
      );
      render(<Header title="Test" rightActions={rightActions} />);
      
      expect(screen.getByRole('button', { name: /language/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument();
    });

    it('does not render right actions section when not provided', () => {
      render(<Header title="Test" />);
      
      const languageButton = screen.queryByRole('button', { name: /language/i });
      expect(languageButton).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('uses semantic header element', () => {
      const { container } = render(<Header title="Test" />);
      expect(container.querySelector('header')).toBeInTheDocument();
    });

    it('menu button has proper aria-label', () => {
      const handleMenuClick = jest.fn();
      render(<Header title="Test" onMenuClick={handleMenuClick} />);
      
      const menuButton = screen.getByRole('button', { name: /open menu/i });
      expect(menuButton).toHaveAttribute('aria-label', 'Open menu');
    });

    it('menu button has type="button"', () => {
      const handleMenuClick = jest.fn();
      render(<Header title="Test" onMenuClick={handleMenuClick} />);
      
      const menuButton = screen.getByRole('button', { name: /open menu/i });
      expect(menuButton).toHaveAttribute('type', 'button');
    });

    it('title uses h1 heading', () => {
      render(<Header title="Test App" />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Test App');
    });
  });

  describe('Layout', () => {
    it('truncates long titles', () => {
      render(<Header title="Very Long Title That Should Be Truncated" />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveClass('truncate');
    });

    it('maintains proper spacing between elements', () => {
      const { container } = render(
        <Header
          title="Test"
          onMenuClick={() => {}}
          rightActions={<button>Action</button>}
        />
      );
      
      const mainContainer = container.querySelector('.flex.items-center.justify-between');
      expect(mainContainer).toHaveClass('gap-4');
    });
  });
});
