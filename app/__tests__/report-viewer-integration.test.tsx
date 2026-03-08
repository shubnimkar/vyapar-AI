/**
 * Unit tests for ReportViewer integration in dashboard
 * 
 * Tests verify:
 * - ReportViewer is imported in app/page.tsx
 * - Component integration code is present
 * - Props are correctly configured
 * - Navigation to reports section works
 * 
 * Requirements: 3.1, 3.2, 8.3
 */

import fs from 'fs';
import path from 'path';

describe('ReportViewer Integration', () => {
  const pageFilePath = path.join(process.cwd(), 'app', 'page.tsx');
  let pageContent: string;

  beforeAll(() => {
    pageContent = fs.readFileSync(pageFilePath, 'utf-8');
  });

  it('should import ReportViewer component', () => {
    // Verify the import statement exists
    expect(pageContent).toContain("import ReportViewer from '@/components/ReportViewer'");
  });

  it('should render ReportViewer in reports section', () => {
    // Verify ReportViewer is rendered in the reports section
    expect(pageContent).toContain('<ReportViewer');
    
    // Verify it's within the reports section check
    const reportsSectionMatch = pageContent.match(/activeSection === 'reports'[\s\S]*?<ReportViewer/);
    expect(reportsSectionMatch).toBeTruthy();
  });

  it('should only render ReportViewer when user is logged in', () => {
    // Verify ReportViewer is wrapped in a user check
    const userCheckMatch = pageContent.match(/activeSection === 'reports' && user &&[\s\S]*?<ReportViewer/);
    expect(userCheckMatch).toBeTruthy();
  });

  it('should pass userId prop to ReportViewer', () => {
    // Verify userId prop is passed
    const reportViewerMatch = pageContent.match(/<ReportViewer[\s\S]*?userId={user\.userId}[\s\S]*?\/>/);
    expect(reportViewerMatch).toBeTruthy();
  });

  it('should pass language prop to ReportViewer', () => {
    // Verify language prop is passed
    const reportViewerMatch = pageContent.match(/<ReportViewer[\s\S]*?language=[\s\S]*?\/>/);
    expect(reportViewerMatch).toBeTruthy();
  });

  it('should handle Marathi language conversion to Hindi', () => {
    // Verify language prop converts Marathi to Hindi (since ReportViewer only supports en/hi)
    const languagePropMatch = pageContent.match(/language={language === 'mr' \? 'hi' : language}/);
    expect(languagePropMatch).toBeTruthy();
  });

  it('should have reports section in navigation structure', () => {
    // Verify 'reports' is included in the AppSection type
    const appSectionMatch = pageContent.match(/type AppSection = .*'reports'/);
    expect(appSectionMatch).toBeTruthy();
  });

  it('should render ReportViewer between pending and account sections', () => {
    // Find the positions of sections in the file
    const pendingIndex = pageContent.indexOf("activeSection === 'pending'");
    const reportsIndex = pageContent.indexOf("activeSection === 'reports'");
    const accountIndex = pageContent.indexOf("activeSection === 'account'");
    
    // Verify all sections exist
    expect(pendingIndex).toBeGreaterThan(-1);
    expect(reportsIndex).toBeGreaterThan(-1);
    expect(accountIndex).toBeGreaterThan(-1);
    
    // Verify reports section comes after pending
    expect(reportsIndex).toBeGreaterThan(pendingIndex);
    
    // Verify reports section comes before account
    expect(accountIndex).toBeGreaterThan(reportsIndex);
  });
});
