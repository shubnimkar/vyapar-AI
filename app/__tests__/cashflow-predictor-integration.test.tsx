/**
 * Unit tests for CashFlowPredictor integration in dashboard
 * 
 * Tests verify:
 * - CashFlowPredictor is imported in app/page.tsx
 * - Component integration code is present
 * - Props are correctly configured
 * 
 * Requirements: 2.1, 2.2, 8.2
 */

import fs from 'fs';
import path from 'path';


describe('CashFlowPredictor Integration', () => {
  const pageFilePath = path.join(process.cwd(), 'app', 'page.tsx');
  let pageContent: string;

  beforeAll(() => {
    pageContent = fs.readFileSync(pageFilePath, 'utf-8');
  });

  it('should import CashFlowPredictor component', () => {
    // Verify the import statement exists
    expect(pageContent).toContain("import CashFlowPredictor from '@/components/CashFlowPredictor'");
  });

  it('should render CashFlowPredictor in dashboard section', () => {
    // Verify CashFlowPredictor is rendered in the dashboard section
    expect(pageContent).toContain('<CashFlowPredictor');
    
    // Verify it's within the dashboard section check
    const dashboardSectionMatch = pageContent.match(/activeSection === 'dashboard'[\s\S]*?<CashFlowPredictor/);
    expect(dashboardSectionMatch).toBeTruthy();
  });

  it('should position CashFlowPredictor after BenchmarkDisplay component', () => {
    // Find the positions of both components in the file
    const benchmarkIndex = pageContent.indexOf('<BenchmarkDisplay');
    const cashFlowIndex = pageContent.indexOf('<CashFlowPredictor');
    
    // Verify both components exist
    expect(benchmarkIndex).toBeGreaterThan(-1);
    expect(cashFlowIndex).toBeGreaterThan(-1);
    
    // Verify CashFlowPredictor comes after BenchmarkDisplay
    expect(cashFlowIndex).toBeGreaterThan(benchmarkIndex);
    
    // Verify it comes before IndicesDashboard
    const indicesIndex = pageContent.indexOf('<IndicesDashboard');
    expect(indicesIndex).toBeGreaterThan(cashFlowIndex);
  });

  it('should pass userId prop to CashFlowPredictor', () => {
    // Verify userId prop is passed
    const cashFlowPredictorMatch = pageContent.match(/<CashFlowPredictor[\s\S]*?userId={user\.userId}[\s\S]*?\/>/);
    expect(cashFlowPredictorMatch).toBeTruthy();
  });

  it('should pass language prop to CashFlowPredictor', () => {
    // Verify language prop is passed
    const cashFlowPredictorMatch = pageContent.match(/<CashFlowPredictor[\s\S]*?language=[\s\S]*?\/>/);
    expect(cashFlowPredictorMatch).toBeTruthy();
  });

  it('should handle Marathi language conversion to Hindi', () => {
    // Verify language prop converts Marathi to Hindi (since CashFlowPredictor only supports en/hi)
    const languagePropMatch = pageContent.match(/language={language === 'mr' \? 'hi' : language}/);
    expect(languagePropMatch).toBeTruthy();
  });

  it('should only render CashFlowPredictor when user is logged in', () => {
    // Verify CashFlowPredictor is wrapped in a user check
    const userCheckMatch = pageContent.match(/{user &&[\s\S]*?<CashFlowPredictor/);
    expect(userCheckMatch).toBeTruthy();
  });

  it('should have comment indicating CashFlowPredictor position', () => {
    // Verify there's a comment indicating the component's position
    expect(pageContent).toContain('Cash Flow Predictor');
    expect(pageContent).toContain('positioned below benchmark');
  });
});
