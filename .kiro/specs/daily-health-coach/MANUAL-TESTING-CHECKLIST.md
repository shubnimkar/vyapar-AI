# Daily Health Coach - Manual Testing Checklist

## Overview

This checklist ensures the Daily Health Coach feature works correctly across all scenarios and languages.

## Prerequisites

- Development server running (`npm run dev`)
- Browser console open for debugging
- Test user account created

## Test Scenarios

### Scenario 1: High Credit Ratio (Critical)

**Setup:**
```javascript
// In browser console
import { demoHighCreditScenario, loadDemoScenario } from './lib/sample-data';
loadDemoScenario(demoHighCreditScenario);
```

**Expected Behavior:**
- [ ] Suggestion appears on dashboard after saving daily entry
- [ ] Severity indicator shows red/critical (⚠️)
- [ ] Title: "High Credit Outstanding" (or translated equivalent)
- [ ] Description mentions 50% credit ratio
- [ ] Dismiss button is visible and functional

**Test in Languages:**
- [ ] English (en)
- [ ] Hindi (hi)
- [ ] Marathi (mr)

---

### Scenario 2: Margin Drop (Warning)

**Setup:**
```javascript
// In browser console
import { demoMarginDropScenario, loadDemoScenario } from './lib/sample-data';
loadDemoScenario(demoMarginDropScenario);
```

**Expected Behavior:**
- [ ] Suggestion appears with warning severity (⚡)
- [ ] Title: "Margin Dropped" (or translated equivalent)
- [ ] Description shows current margin (20%) vs average (35%)
- [ ] Orange/warning styling applied
- [ ] Dismiss button works

**Test in Languages:**
- [ ] English (en)
- [ ] Hindi (hi)
- [ ] Marathi (mr)

---

### Scenario 3: Low Cash Buffer (Critical)

**Setup:**
```javascript
// In browser console
import { demoLowCashScenario, loadDemoScenario } from './lib/sample-data';
loadDemoScenario(demoLowCashScenario);
```

**Expected Behavior:**
- [ ] Critical suggestion appears (⚠️)
- [ ] Title: "Low Cash Buffer" (or translated equivalent)
- [ ] Description mentions 5 days of cash remaining
- [ ] Red/critical styling
- [ ] Dismiss functionality works

**Test in Languages:**
- [ ] English (en)
- [ ] Hindi (hi)
- [ ] Marathi (mr)

---

### Scenario 4: Healthy State (Info)

**Setup:**
```javascript
// In browser console
import { demoHealthyStateScenario, loadDemoScenario } from './lib/sample-data';
loadDemoScenario(demoHealthyStateScenario);
```

**Expected Behavior:**
- [ ] Info suggestion appears (💡)
- [ ] Title: "Business is Healthy" (or translated equivalent)
- [ ] Description shows optimization tip (rotates based on date)
- [ ] Blue/info styling
- [ ] Dismiss button works

**Test Tip Rotation:**
- [ ] Change date and verify different tips appear
- [ ] Tips should rotate through: inventory, credit terms, bulk buying, expense review

**Test in Languages:**
- [ ] English (en)
- [ ] Hindi (hi)
- [ ] Marathi (mr)

---

### Scenario 5: Multiple Issues

**Setup:**
```javascript
// In browser console
import { demoMultipleIssuesScenario, loadDemoScenario } from './lib/sample-data';
loadDemoScenario(demoMultipleIssuesScenario);
```

**Expected Behavior:**
- [ ] Multiple suggestions generated
- [ ] Highest severity (critical) shown first
- [ ] Can dismiss individual suggestions
- [ ] After dismissing top suggestion, next one appears
- [ ] Dismissed suggestions don't reappear on page refresh

---

## Functional Tests

### Dismiss Functionality

- [ ] Click dismiss button
- [ ] Suggestion disappears immediately
- [ ] Dismissed state persists in localStorage
- [ ] Dismissed suggestion doesn't reappear on page refresh
- [ ] Dismissed timestamp is valid ISO 8601 format

### Persistence Tests

- [ ] Suggestions save to localStorage with daily entry
- [ ] Suggestions sync to DynamoDB when online
- [ ] Suggestions load correctly on page refresh
- [ ] Dismissed state persists across sessions

### Offline Functionality

- [ ] Disconnect network
- [ ] Create new daily entry
- [ ] Suggestions still generate (offline-first)
- [ ] Dismiss functionality works offline
- [ ] Reconnect and verify sync

### Entry Update Behavior

- [ ] Create daily entry with suggestions
- [ ] Update the same entry (change sales/expenses)
- [ ] Verify suggestions are regenerated
- [ ] Old suggestions are replaced, not appended
- [ ] Dismissed state is reset on update

---

## UI/UX Tests

### Accessibility

- [ ] Tab navigation works (Tab key moves focus)
- [ ] Enter key dismisses suggestion when button focused
- [ ] Escape key dismisses suggestion
- [ ] Screen reader announces suggestion (test with VoiceOver/NVDA)
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1 minimum)
- [ ] Icons + color used together (not color alone)

### Responsive Design

- [ ] Suggestion card displays correctly on mobile (< 768px)
- [ ] Suggestion card displays correctly on tablet (768px - 1024px)
- [ ] Suggestion card displays correctly on desktop (> 1024px)
- [ ] Text wraps appropriately on small screens
- [ ] Dismiss button remains accessible on all screen sizes

### Visual Styling

- [ ] Critical suggestions: Red background/border
- [ ] Warning suggestions: Orange background/border
- [ ] Info suggestions: Blue background/border
- [ ] Icons display correctly (⚠️, ⚡, 💡)
- [ ] Typography is readable and consistent

---

## Error Handling Tests

### Invalid Data

- [ ] Create entry with missing fields
- [ ] Verify suggestion generation doesn't crash
- [ ] Empty suggestions array returned gracefully
- [ ] Daily entry save still succeeds

### Insufficient Historical Data

- [ ] Create first daily entry (no history)
- [ ] Verify no margin drop or cash buffer suggestions
- [ ] Healthy state or high credit suggestions may still appear
- [ ] No errors in console

### localStorage Quota Exceeded

- [ ] Fill localStorage to near capacity
- [ ] Create daily entry with suggestions
- [ ] Verify graceful handling (cleanup or error message)
- [ ] Entry save doesn't fail

---

## Translation Tests

### English (en)

- [ ] All suggestion titles in English
- [ ] All descriptions in English
- [ ] Numbers formatted correctly (e.g., "50%", "5 days")
- [ ] No translation keys visible (e.g., "{{ratio}}")

### Hindi (hi)

- [ ] All suggestion titles in Hindi
- [ ] All descriptions in Hindi
- [ ] Numbers formatted correctly
- [ ] Devanagari script renders properly
- [ ] No translation keys visible

### Marathi (mr)

- [ ] All suggestion titles in Marathi
- [ ] All descriptions in Marathi
- [ ] Numbers formatted correctly
- [ ] Devanagari script renders properly
- [ ] No translation keys visible

### Fallback Behavior

- [ ] Set invalid language code (e.g., 'xx')
- [ ] Verify fallback to English
- [ ] No errors in console

---

## Integration Tests

### Dashboard Integration

- [ ] Suggestion card appears on main dashboard
- [ ] Card positioned prominently (top of page)
- [ ] Card doesn't block other UI elements
- [ ] Card integrates with existing layout

### Daily Entry Form Integration

- [ ] Save daily entry
- [ ] Suggestion appears immediately (no page refresh needed)
- [ ] Form doesn't freeze during suggestion generation
- [ ] Form validation still works

### DynamoDB Sync Integration

- [ ] Create entry with suggestions while online
- [ ] Verify suggestions in DynamoDB (check AWS console)
- [ ] PK: USER#{user_id}, SK: DAILY_ENTRY#{date}
- [ ] Suggestions array stored correctly

---

## Performance Tests

- [ ] Suggestion generation completes in < 100ms
- [ ] No UI lag when saving daily entry
- [ ] No memory leaks (check browser DevTools)
- [ ] localStorage operations don't block UI

---

## Demo Rehearsal

Complete this flow without errors:

1. [ ] New user signs up
2. [ ] Completes profile setup
3. [ ] Creates first daily entry
4. [ ] Health score displays
5. [ ] Suggestion appears (if applicable)
6. [ ] User dismisses suggestion
7. [ ] Creates second daily entry next day
8. [ ] Different suggestion appears (if applicable)
9. [ ] User can navigate away and return
10. [ ] Suggestions persist correctly

---

## Known Issues / Notes

Document any issues found during testing:

- Issue 1: [Description]
- Issue 2: [Description]

---

## Sign-off

- [ ] All critical tests passed
- [ ] All languages tested
- [ ] Accessibility verified
- [ ] Demo rehearsal successful
- [ ] Ready for production

**Tested by:** _______________  
**Date:** _______________  
**Environment:** _______________
