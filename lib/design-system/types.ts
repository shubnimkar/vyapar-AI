/**
 * Design System TypeScript Types
 * 
 * Type definitions for design tokens and component props.
 * These types ensure type safety when using design tokens in components.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md for complete specifications
 */

export type ColorShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export interface ColorPalette {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

export interface NeutralColorPalette extends ColorPalette {
  0: string;
  950: string;
}

export interface FinancialColors {
  profit: string;
  loss: string;
  neutral: string;
}

export interface TypographyScale {
  fontSize: string;
  lineHeight: string;
}

export interface SpacingScale {
  [key: string]: string;
}

export interface ShadowScale {
  none: string;
  sm: string;
  base: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

export interface BorderRadiusScale {
  none: string;
  sm: string;
  base: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  full: string;
}

export interface AnimationTokens {
  duration: {
    fast: string;
    base: string;
    slow: string;
  };
  easing: {
    easeIn: string;
    easeOut: string;
    easeInOut: string;
  };
}

export interface Breakpoints {
  mobile: string;
  tablet: string;
  desktop: string;
  wide: string;
}

export interface TouchTarget {
  minSize: string;
}

// Component prop types
export type Size = 'sm' | 'md' | 'lg';
export type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type State = 'default' | 'hover' | 'active' | 'focus' | 'disabled';
export type Elevation = 'flat' | 'raised' | 'elevated';
export type Density = 'compact' | 'comfortable';

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface InteractiveComponentProps extends BaseComponentProps {
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

export interface FormComponentProps extends BaseComponentProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
}
