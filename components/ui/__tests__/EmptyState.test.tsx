/**
 * EmptyState Component Unit Tests
 * 
 * Tests specific examples and edge cases for the EmptyState component.
 * Complements property-based tests.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirements 10.1-10.7
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { EmptyState } from '../EmptyState';
import { FileText, CreditCard } from 'lucide-react';

describe('EmptyState Component', () => {
  describe('Basic Rendering', () => {
    it('renders with required props', () => {
      render(
        <EmptyState
          icon={<FileText className="w-12 h-12" data-testid="icon" />}
          title="No data available"
        />
      );
      
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('renders within a Card component', () => {
      const { container } = render(
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="No data"
        />
      );
      
      // Card should have white background and rounded corners
      const card = container.querySelector('.bg-white.rounded-lg');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Icon Display (Requirement 10.1)', () => {
    it('displays icon with 48px size', () => {
      render(
        <EmptyState
          icon={<FileText className="w-12 h-12" data-testid="icon" />}
          title="No entries"
        />
      );
      
      const iconContainer = screen.getByTestId('icon').parentElement;
      expect(iconContainer).toHaveClass('w-12', 'h-12');
    });

    it('displays icon with neutral-400 color', () => {
      render(
        <EmptyState
          icon={<FileText className="w-12 h-12" data-testid="icon" />}
          title="No entries"
        />
      );
      
      const iconContainer = screen.getByTestId('icon').parentElement;
      expect(iconContainer).toHaveClass('text-neutral-400');
    });

    it('renders different icons correctly', () => {
      const { rerender } = render(
        <EmptyState
          icon={<FileText className="w-12 h-12" data-testid="file-icon" />}
          title="No files"
        />
      );
      
      expect(screen.getByTestId('file-icon')).toBeInTheDocument();
      
      rerender(
        <EmptyState
          icon={<CreditCard className="w-12 h-12" data-testid="card-icon" />}
          title="No cards"
        />
      );
      
      expect(screen.getByTestId('card-icon')).toBeInTheDocument();
    });
  });

  describe('Title Display (Requirement 10.2)', () => {
    it('displays title with text-lg font-semibold', () => {
      render(
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="No daily entries yet"
        />
      );
      
      const title = screen.getByText('No daily entries yet');
      expect(title).toHaveClass('text-lg', 'font-semibold', 'text-neutral-900');
    });

    it('renders title as h3 element', () => {
      render(
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="No data"
        />
      );
      
      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveTextContent('No data');
    });
  });

  describe('Description Display (Requirement 10.3)', () => {
    it('displays description when provided', () => {
      render(
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="No entries"
          description="Start tracking your business by adding your first daily entry"
        />
      );
      
      const description = screen.getByText(/Start tracking your business/);
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass('text-sm', 'text-neutral-600', 'max-w-md');
    });

    it('does not render description when not provided', () => {
      const { container } = render(
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="No entries"
        />
      );
      
      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs).toHaveLength(0);
    });

    it('centers description text', () => {
      render(
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="No entries"
          description="This is a description"
        />
      );
      
      const description = screen.getByText('This is a description');
      expect(description.parentElement).toHaveClass('text-center');
    });
  });

  describe('Action Button (Requirement 10.4)', () => {
    it('displays action button when provided', () => {
      const handleClick = jest.fn();
      
      render(
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="No entries"
          action={{ label: 'Add Entry', onClick: handleClick }}
        />
      );
      
      const button = screen.getByRole('button', { name: /add entry/i });
      expect(button).toBeInTheDocument();
    });

    it('calls onClick when action button is clicked', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      
      render(
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="No entries"
          action={{ label: 'Add Entry', onClick: handleClick }}
        />
      );
      
      const button = screen.getByRole('button', { name: /add entry/i });
      await user.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not render button when action is not provided', () => {
      render(
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="No entries"
        />
      );
      
      const buttons = screen.queryAllByRole('button');
      expect(buttons).toHaveLength(0);
    });
  });

  describe('Content Centering (Requirement 10.5)', () => {
    it('centers content vertically and horizontally', () => {
      const { container } = render(
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="No entries"
        />
      );
      
      const contentContainer = container.querySelector('.flex.flex-col.items-center.justify-center');
      expect(contentContainer).toBeInTheDocument();
      expect(contentContainer).toHaveClass('text-center');
    });
  });

  describe('Multi-Language Support (Requirement 10.7)', () => {
    it('displays English text', () => {
      render(
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="No daily entries yet"
          description="Start tracking your business"
          action={{ label: 'Add Entry', onClick: jest.fn() }}
        />
      );
      
      expect(screen.getByText('No daily entries yet')).toBeInTheDocument();
      expect(screen.getByText('Start tracking your business')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add entry/i })).toBeInTheDocument();
    });

    it('displays Hindi text via props', () => {
      render(
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="अभी तक कोई दैनिक प्रविष्टि नहीं"
          description="अपनी पहली दैनिक प्रविष्टि जोड़कर अपने व्यवसाय को ट्रैक करना शुरू करें"
          action={{ label: 'प्रविष्टि जोड़ें', onClick: jest.fn() }}
        />
      );
      
      expect(screen.getByText('अभी तक कोई दैनिक प्रविष्टि नहीं')).toBeInTheDocument();
    });

    it('displays Marathi text via props', () => {
      render(
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="अद्याप कोणतीही दैनिक नोंद नाही"
          description="तुमची पहिली दैनिक नोंद जोडून तुमचा व्यवसाय ट्रॅक करणे सुरू करा"
          action={{ label: 'नोंद जोडा', onClick: jest.fn() }}
        />
      );
      
      expect(screen.getByText('अद्याप कोणतीही दैनिक नोंद नाही')).toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className to Card', () => {
      const { container } = render(
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="No entries"
          className="custom-empty-state"
        />
      );
      
      const card = container.querySelector('.custom-empty-state');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Complete Examples', () => {
    it('renders complete empty state with all props', () => {
      const handleClick = jest.fn();
      
      render(
        <EmptyState
          icon={<FileText className="w-12 h-12" data-testid="icon" />}
          title="No daily entries yet"
          description="Start tracking your business by adding your first daily entry"
          action={{ label: 'Add Entry', onClick: handleClick }}
          className="custom-class"
        />
      );
      
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('No daily entries yet')).toBeInTheDocument();
      expect(screen.getByText(/Start tracking your business/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add entry/i })).toBeInTheDocument();
    });

    it('renders minimal empty state with only required props', () => {
      render(
        <EmptyState
          icon={<FileText className="w-12 h-12" data-testid="icon" />}
          title="No data"
        />
      );
      
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('No data')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles very long title text', () => {
      const longTitle = 'This is a very long title that might wrap to multiple lines in the empty state component';
      
      render(
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title={longTitle}
        />
      );
      
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('handles very long description text', () => {
      const longDescription = 'This is a very long description that provides detailed information about why there is no data and what the user should do next to resolve this situation.';
      
      render(
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="No data"
          description={longDescription}
        />
      );
      
      const description = screen.getByText(longDescription);
      expect(description).toHaveClass('max-w-md'); // Should constrain width
    });

    it('handles empty string title', () => {
      render(
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title=""
        />
      );
      
      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('');
    });
  });
});
