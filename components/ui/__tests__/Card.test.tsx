/**
 * Card Component Unit Tests
 * 
 * Tests specific examples, edge cases, and component rendering for the Card component.
 * 
 * @see components/ui/Card.tsx
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirement 7
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Card, CardHeader, CardBody, CardFooter, CardSkeleton } from '../Card';

describe('Card Component', () => {
  describe('Basic Rendering', () => {
    it('should render children correctly', () => {
      render(<Card>Test Content</Card>);
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should apply white background and rounded corners', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('bg-white', 'rounded-lg');
    });

    it('should apply subtle border', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('border', 'border-neutral-200');
    });
  });

  describe('Elevation Levels', () => {
    it('should apply flat elevation (no shadow)', () => {
      const { container } = render(<Card elevation="flat">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('border', 'border-neutral-200');
      expect(card).not.toHaveClass('shadow-sm', 'shadow-md');
    });

    it('should apply raised elevation (shadow-sm)', () => {
      const { container } = render(<Card elevation="raised">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('shadow-sm');
    });

    it('should apply elevated elevation (shadow-md)', () => {
      const { container } = render(<Card elevation="elevated">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('shadow-md');
    });

    it('should default to raised elevation', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('shadow-sm');
    });
  });

  describe('Density Options', () => {
    it('should apply compact density (p-4)', () => {
      const { container } = render(<Card density="compact">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-4');
    });

    it('should apply comfortable density (p-6)', () => {
      const { container } = render(<Card density="comfortable">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-6');
    });

    it('should default to comfortable density', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-6');
    });
  });

  describe('Interactive Variant', () => {
    it('should apply cursor-pointer for interactive cards', () => {
      const { container } = render(<Card interactive>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('cursor-pointer');
    });

    it('should apply hover classes for interactive cards', () => {
      const { container } = render(<Card interactive>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('hover:border-primary-300', 'hover:shadow-lg');
    });

    it('should apply active scale effect for interactive cards', () => {
      const { container } = render(<Card interactive>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('active:scale-[0.99]');
    });

    it('should call onClick when interactive card is clicked', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      const { container } = render(<Card interactive onClick={handleClick}>Content</Card>);
      
      const card = container.firstChild as HTMLElement;
      await user.click(card);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not apply interactive classes when interactive is false', () => {
      const { container } = render(<Card interactive={false}>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).not.toHaveClass('cursor-pointer');
    });
  });

  describe('Loading State', () => {
    it('should apply animate-pulse when loading', () => {
      const { container } = render(<Card loading>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('animate-pulse');
    });

    it('should not apply animate-pulse when not loading', () => {
      const { container } = render(<Card loading={false}>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).not.toHaveClass('animate-pulse');
    });
  });

  describe('Custom ClassName', () => {
    it('should merge custom className with default classes', () => {
      const { container } = render(<Card className="custom-class">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('custom-class', 'bg-white', 'rounded-lg');
    });
  });

  describe('HTML Attributes', () => {
    it('should pass through HTML attributes', () => {
      const { container } = render(
        <Card data-testid="test-card" aria-label="Test Card">
          Content
        </Card>
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('data-testid', 'test-card');
      expect(card).toHaveAttribute('aria-label', 'Test Card');
    });
  });
});

describe('CardHeader Component', () => {
  it('should render children correctly', () => {
    render(
      <Card>
        <CardHeader>Header Content</CardHeader>
      </Card>
    );
    expect(screen.getByText('Header Content')).toBeInTheDocument();
  });

  it('should apply bottom margin', () => {
    const { container } = render(
      <Card>
        <CardHeader>Header</CardHeader>
      </Card>
    );
    const header = screen.getByText('Header');
    expect(header).toHaveClass('mb-4');
  });

  it('should merge custom className', () => {
    const { container } = render(
      <Card>
        <CardHeader className="custom-header">Header</CardHeader>
      </Card>
    );
    const header = screen.getByText('Header');
    expect(header).toHaveClass('custom-header', 'mb-4');
  });
});

describe('CardBody Component', () => {
  it('should render children correctly', () => {
    render(
      <Card>
        <CardBody>Body Content</CardBody>
      </Card>
    );
    expect(screen.getByText('Body Content')).toBeInTheDocument();
  });

  it('should merge custom className', () => {
    const { container } = render(
      <Card>
        <CardBody className="custom-body">Body</CardBody>
      </Card>
    );
    const body = screen.getByText('Body');
    expect(body).toHaveClass('custom-body');
  });
});

describe('CardFooter Component', () => {
  it('should render children correctly', () => {
    render(
      <Card>
        <CardFooter>Footer Content</CardFooter>
      </Card>
    );
    expect(screen.getByText('Footer Content')).toBeInTheDocument();
  });

  it('should apply top margin and padding', () => {
    const { container } = render(
      <Card>
        <CardFooter>Footer</CardFooter>
      </Card>
    );
    const footer = screen.getByText('Footer');
    expect(footer).toHaveClass('mt-4', 'pt-4');
  });

  it('should apply top border', () => {
    const { container } = render(
      <Card>
        <CardFooter>Footer</CardFooter>
      </Card>
    );
    const footer = screen.getByText('Footer');
    expect(footer).toHaveClass('border-t', 'border-neutral-200');
  });

  it('should merge custom className', () => {
    const { container } = render(
      <Card>
        <CardFooter className="custom-footer">Footer</CardFooter>
      </Card>
    );
    const footer = screen.getByText('Footer');
    expect(footer).toHaveClass('custom-footer', 'mt-4', 'pt-4');
  });
});

describe('CardSkeleton Component', () => {
  it('should render skeleton placeholders', () => {
    const { container } = render(<CardSkeleton />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should apply comfortable density by default', () => {
    const { container } = render(<CardSkeleton />);
    const card = container.querySelector('.p-6');
    expect(card).toBeInTheDocument();
  });

  it('should apply compact density when specified', () => {
    const { container } = render(<CardSkeleton density="compact" />);
    const card = container.querySelector('.p-4');
    expect(card).toBeInTheDocument();
  });

  it('should apply loading state', () => {
    const { container } = render(<CardSkeleton />);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('animate-pulse');
  });

  it('should merge custom className', () => {
    const { container } = render(<CardSkeleton className="custom-skeleton" />);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('custom-skeleton');
  });
});

describe('Card Composition', () => {
  it('should render complete card with all sub-components', () => {
    render(
      <Card>
        <CardHeader>
          <h2>Card Title</h2>
        </CardHeader>
        <CardBody>
          <p>Card body content</p>
        </CardBody>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card body content')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('should work with only header and body', () => {
    render(
      <Card>
        <CardHeader>Header</CardHeader>
        <CardBody>Body</CardBody>
      </Card>
    );

    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('should work with only body', () => {
    render(
      <Card>
        <CardBody>Body Only</CardBody>
      </Card>
    );

    expect(screen.getByText('Body Only')).toBeInTheDocument();
  });
});

describe('Edge Cases', () => {
  it('should handle empty children', () => {
    const { container } = render(<Card />);
    const card = container.firstChild as HTMLElement;
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('bg-white');
  });

  it('should handle multiple elevation and density combinations', () => {
    const { container: container1 } = render(
      <Card elevation="flat" density="compact">Content</Card>
    );
    const card1 = container1.firstChild as HTMLElement;
    expect(card1).toHaveClass('p-4');
    expect(card1).not.toHaveClass('shadow-sm');

    const { container: container2 } = render(
      <Card elevation="elevated" density="comfortable">Content</Card>
    );
    const card2 = container2.firstChild as HTMLElement;
    expect(card2).toHaveClass('p-6', 'shadow-md');
  });

  it('should handle interactive and loading states together', () => {
    const { container } = render(
      <Card interactive loading>Content</Card>
    );
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('cursor-pointer', 'animate-pulse');
  });
});
