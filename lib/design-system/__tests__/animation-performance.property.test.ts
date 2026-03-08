/**
 * Property-Based Tests for Animation Performance
 * 
 * Feature: ui-ux-redesign, Property 36: Animation Performance
 * 
 * Validates: Requirements 19.4
 * 
 * Property 36: Animation Performance
 * For any component animation, the system SHALL use CSS transform properties 
 * instead of layout-triggering properties (width, height, top, left) for better performance.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md - Property 36
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirement 19.4
 */

import * as fc from 'fast-check';
import fs from 'fs';
import path from 'path';

describe('Property 36: Animation Performance', () => {
  /**
   * Property: Animation keyframes use transform properties
   * 
   * This property ensures that animations use GPU-accelerated transform properties
   * instead of layout-triggering properties for better performance.
   */
  it('should use transform properties in animation keyframes', () => {
    // Read the global CSS file
    const globalCssPath = path.join(process.cwd(), 'app/globals.css');
    const globalCss = fs.readFileSync(globalCssPath, 'utf-8');
    
    // Extract all @keyframes blocks
    const keyframesRegex = /@keyframes\s+([a-z-]+)\s*{([^}]+)}/g;
    const keyframes: Array<{ name: string; content: string }> = [];
    
    let match;
    while ((match = keyframesRegex.exec(globalCss)) !== null) {
      keyframes.push({
        name: match[1],
        content: match[2],
      });
    }
    
    // Layout-triggering properties that should be avoided
    const layoutProperties = ['width', 'height', 'top', 'left', 'right', 'bottom', 'margin', 'padding'];
    
    // Performance-friendly properties that should be used
    const performantProperties = ['transform', 'opacity'];
    
    fc.assert(
      fc.property(
        fc.constantFrom(...keyframes),
        (keyframe) => {
          // Check if keyframe uses layout-triggering properties
          const usesLayoutProperties = layoutProperties.some(prop => 
            new RegExp(`\\b${prop}\\s*:`).test(keyframe.content)
          );
          
          // Check if keyframe uses performant properties
          const usesPerformantProperties = performantProperties.some(prop =>
            new RegExp(`\\b${prop}\\s*:`).test(keyframe.content)
          );
          
          // Log violations for debugging
          if (usesLayoutProperties) {
            console.error(`Keyframe '${keyframe.name}' uses layout-triggering properties:`);
            console.error(keyframe.content);
            console.error('Use transform and opacity instead for better performance');
          }
          
          // Keyframes should either use performant properties or no animated properties
          // (some keyframes might just define states without animations)
          return !usesLayoutProperties || usesPerformantProperties;
        }
      ),
      { numRuns: keyframes.length > 0 ? keyframes.length : 1 }
    );
  });

  /**
   * Property: Transform-based animations use GPU-accelerated properties
   * 
   * This property ensures that transform animations use properties that
   * trigger GPU acceleration (translate, scale, rotate).
   */
  it('should use GPU-accelerated transform properties', () => {
    const globalCssPath = path.join(process.cwd(), 'app/globals.css');
    const globalCss = fs.readFileSync(globalCssPath, 'utf-8');
    
    // Extract all transform values from keyframes
    const transformRegex = /transform:\s*([^;]+);/g;
    const transforms: string[] = [];
    
    let match;
    while ((match = transformRegex.exec(globalCss)) !== null) {
      transforms.push(match[1]);
    }
    
    // GPU-accelerated transform functions
    const gpuAcceleratedFunctions = ['translate', 'translateX', 'translateY', 'translateZ', 'translate3d', 'scale', 'scaleX', 'scaleY', 'scaleZ', 'scale3d', 'rotate', 'rotateX', 'rotateY', 'rotateZ', 'rotate3d'];
    
    fc.assert(
      fc.property(
        fc.constantFrom(...(transforms.length > 0 ? transforms : ['translate(0)'])),
        (transform) => {
          // Check if transform uses GPU-accelerated functions
          const usesGPUAcceleration = gpuAcceleratedFunctions.some(func =>
            transform.includes(func)
          );
          
          if (!usesGPUAcceleration && transform !== 'none') {
            console.error(`Transform does not use GPU-accelerated functions: ${transform}`);
          }
          
          return usesGPUAcceleration || transform === 'none';
        }
      ),
      { numRuns: transforms.length > 0 ? transforms.length : 1 }
    );
  });

  /**
   * Unit Test: Verify specific animations use transform
   * 
   * This test checks that common animations use transform properties.
   */
  it('should use transform in slide animations', () => {
    const globalCssPath = path.join(process.cwd(), 'app/globals.css');
    const globalCss = fs.readFileSync(globalCssPath, 'utf-8');
    
    // Check slide-in-right animation
    const slideInRightMatch = globalCss.match(/@keyframes\s+slide-in-right\s*{([^}]+)}/);
    if (slideInRightMatch) {
      expect(slideInRightMatch[1]).toMatch(/transform:/);
      expect(slideInRightMatch[1]).toMatch(/translateX/);
    }
    
    // Check slide-up animation
    const slideUpMatch = globalCss.match(/@keyframes\s+slide-up\s*{([^}]+)}/);
    if (slideUpMatch) {
      expect(slideUpMatch[1]).toMatch(/transform:/);
      expect(slideUpMatch[1]).toMatch(/translateY/);
    }
  });

  /**
   * Unit Test: Verify scale animation uses transform
   * 
   * This test checks that scale animations use transform property.
   */
  it('should use transform in scale animations', () => {
    const globalCssPath = path.join(process.cwd(), 'app/globals.css');
    const globalCss = fs.readFileSync(globalCssPath, 'utf-8');
    
    // Check scale-in animation
    const scaleInMatch = globalCss.match(/@keyframes\s+scale-in\s*{([^}]+)}/);
    if (scaleInMatch) {
      expect(scaleInMatch[1]).toMatch(/transform:/);
      expect(scaleInMatch[1]).toMatch(/scale/);
    }
  });

  /**
   * Unit Test: Verify fade animation uses opacity
   * 
   * This test checks that fade animations use opacity property (also performant).
   */
  it('should use opacity in fade animations', () => {
    const globalCssPath = path.join(process.cwd(), 'app/globals.css');
    const globalCss = fs.readFileSync(globalCssPath, 'utf-8');
    
    // Check fade-in animation
    const fadeInMatch = globalCss.match(/@keyframes\s+fade-in\s*{([^}]+)}/);
    if (fadeInMatch) {
      expect(fadeInMatch[1]).toMatch(/opacity:/);
    }
  });

  /**
   * Unit Test: Verify animations don't use layout-triggering properties
   * 
   * This test ensures that no animations use properties that trigger layout recalculation.
   */
  it('should not use layout-triggering properties in animations', () => {
    const globalCssPath = path.join(process.cwd(), 'app/globals.css');
    const globalCss = fs.readFileSync(globalCssPath, 'utf-8');
    
    // Extract all @keyframes blocks
    const keyframesRegex = /@keyframes\s+([a-z-]+)\s*{([^}]+)}/g;
    
    let match;
    while ((match = keyframesRegex.exec(globalCss)) !== null) {
      const keyframeName = match[1];
      const keyframeContent = match[2];
      
      // Check for layout-triggering properties
      expect(keyframeContent).not.toMatch(/\bwidth\s*:/);
      expect(keyframeContent).not.toMatch(/\bheight\s*:/);
      expect(keyframeContent).not.toMatch(/\btop\s*:/);
      expect(keyframeContent).not.toMatch(/\bleft\s*:/);
      expect(keyframeContent).not.toMatch(/\bright\s*:/);
      expect(keyframeContent).not.toMatch(/\bbottom\s*:/);
      expect(keyframeContent).not.toMatch(/\bmargin\s*:/);
      expect(keyframeContent).not.toMatch(/\bpadding\s*:/);
    }
  });

  /**
   * Unit Test: Verify prefers-reduced-motion support
   * 
   * This test ensures that the CSS includes prefers-reduced-motion media query
   * for accessibility.
   */
  it('should include prefers-reduced-motion media query for accessibility', () => {
    const globalCssPath = path.join(process.cwd(), 'app/globals.css');
    const globalCss = fs.readFileSync(globalCssPath, 'utf-8');
    
    expect(globalCss).toMatch(/@media\s+\(prefers-reduced-motion:\s*reduce\)/);
  });
});
