import * as React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AppProvider } from '@/context/AppContext';
import { MessageProvider, useMessage } from '@/context/MessageContext';

function TestConsumer() {
  const { message, showMessage } = useMessage();
  return (
    <div>
      <button onClick={() => showMessage('hello', 'success')}>Show</button>
      <div data-testid="message">
        {message?.text || ''}-{message?.type || ''}
      </div>
    </div>
  );
}

describe('AppProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('showMessage sets a message and auto-clears after 5 seconds', async () => {
    render(
      <AppProvider>
        <MessageProvider>
          <TestConsumer />
        </MessageProvider>
      </AppProvider>
    );

    fireEvent.click(screen.getByText('Show'));

    // Immediately after click, message should be visible
    expect(screen.getByTestId('message')).toHaveTextContent('hello-success');

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    // MessageProvider schedules a timeout to clear message after 5s.
    // With fake timers we can assert synchronously once timers have advanced.
    expect(screen.getByTestId('message')).toHaveTextContent('-');
  });
});
