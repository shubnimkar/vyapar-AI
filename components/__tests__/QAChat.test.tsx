/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import QAChat from '../QAChat';

beforeAll(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: jest.fn(),
  });
});

describe('QAChat multilingual behavior', () => {
  it('renders translated quick questions in Marathi from translation keys', () => {
    render(
      <QAChat
        sessionId="session-1"
        language="mr"
        dataSources={{
          dailyEntries: 1,
          creditEntries: 1,
          reports: 0,
          salesData: false,
          expensesData: false,
          inventoryData: false,
        }}
        appContext={{
          activeSection: 'credit',
        }}
      />
    );

    expect(screen.getByText('प्रश्न विचारा')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('तुमच्या व्यवसायाबद्दल प्रश्न टाइप करा...')).toBeInTheDocument();
    expect(screen.getByText('आज मला कोणाशी फॉलो-अप करायला हवा?')).toBeInTheDocument();
    expect(screen.getByText('उधारीत किती पैसे अडकले आहेत?')).toBeInTheDocument();
  });

  it('renders Hindi structured answer labels and translated source chips', async () => {
    render(
      <QAChat
        sessionId="session-2"
        language="hi"
        initialMessages={[
          {
            role: 'assistant',
            content: 'निष्कर्ष: आज 2 ग्राहकों से फॉलो-अप करें\nक्यों: सबसे पुरानी उधारी 11 दिन से लंबित है\nअगला कदम: पहले Ganesh और Mohan को याद दिलाएं',
            sourcesUsed: ['credit_entries', 'reports'],
          },
        ]}
        dataSources={{
          dailyEntries: 0,
          creditEntries: 1,
          reports: 1,
          salesData: false,
          expensesData: false,
          inventoryData: false,
        }}
      />
    );

    expect(await screen.findByText('निष्कर्ष')).toBeInTheDocument();
    expect(screen.getByText('क्यों')).toBeInTheDocument();
    expect(screen.getByText('अगला कदम')).toBeInTheDocument();
    expect(screen.getByText('इस्तेमाल किया गया डेटा')).toBeInTheDocument();
    expect(screen.getByText('उधार रिकॉर्ड')).toBeInTheDocument();
    expect(screen.getByText('रिपोर्ट')).toBeInTheDocument();
  });
});
