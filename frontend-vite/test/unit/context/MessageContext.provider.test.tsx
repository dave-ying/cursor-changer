import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import { MessageProvider, useMessage } from '@/context/MessageContext';

const loggerMock = vi.hoisted(() => ({
  warn: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  error: vi.fn()
}));

vi.mock('@/utils/logger', () => ({
  logger: loggerMock
}));

const storeStateRef = { current: null as any };
const useAppStoreMock = vi.fn((selector?: (state: any) => any) => {
  const state = storeStateRef.current;
  if (typeof selector === 'function') {
    return selector(state);
  }
  return state;
});

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (selector?: (state: any) => any) => useAppStoreMock(selector)
}));

function createStoreState(overrides: any = {}) {
  return {
    message: { text: '', type: '' },
    addToast: vi.fn(),
    showMessage: vi.fn(),
    clearMessage: vi.fn(),
    ...overrides
  };
}

function MessageConsumer() {
  const { message, addToast, showMessage } = useMessage();
  return (
    <div>
      <span data-testid="message-text">{`${message.text}-${message.type}`}</span>
      <button onClick={() => addToast('toast msg', 'warning', 2500)}>toast</button>
      <button onClick={() => showMessage('hello', 'success')}>show</button>
    </div>
  );
}

beforeEach(() => {
  storeStateRef.current = createStoreState();
  useAppStoreMock.mockClear();
  Object.values(loggerMock).forEach((mockFn) => mockFn.mockClear());
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('MessageProvider bridge', () => {
  it('exposes current store message and delegates addToast/showMessage', () => {
    storeStateRef.current = createStoreState({
      message: { text: 'existing', type: 'info' }
    });

    render(
      <MessageProvider>
        <MessageConsumer />
      </MessageProvider>
    );

    expect(screen.getByTestId('message-text').textContent).toBe('existing-info');

    fireEvent.click(screen.getByText('toast'));
    expect(storeStateRef.current.addToast).toHaveBeenCalledWith('toast msg', 'warning', 2500);

    fireEvent.click(screen.getByText('show'));
    expect(storeStateRef.current.showMessage).toHaveBeenCalledWith('hello', 'success');
  });

  it('logs a warning when store addToast is unavailable', () => {
    storeStateRef.current = createStoreState({ addToast: undefined });

    render(
      <MessageProvider>
        <MessageConsumer />
      </MessageProvider>
    );

    fireEvent.click(screen.getByText('toast'));
    expect(loggerMock.warn).toHaveBeenCalledWith(
      '[MessageContext] addToast called but addToast is not available on store'
    );
  });

  it('enqueues legacy toast on showMessage and clears message after timeout', () => {
    vi.useFakeTimers();
    const clearMessageSpy = vi.fn();
    storeStateRef.current = createStoreState({ clearMessage: clearMessageSpy });

    render(
      <MessageProvider>
        <MessageConsumer />
      </MessageProvider>
    );

    fireEvent.click(screen.getByText('show'));

    expect(storeStateRef.current.showMessage).toHaveBeenCalledWith('hello', 'success');
    expect(storeStateRef.current.addToast).toHaveBeenCalledWith('hello', 'success', 4000);

    vi.advanceTimersByTime(5000);
    expect(clearMessageSpy).toHaveBeenCalledTimes(1);
  });

  it('warns when showMessage is missing on the store', () => {
    storeStateRef.current = createStoreState({ showMessage: undefined });

    render(
      <MessageProvider>
        <MessageConsumer />
      </MessageProvider>
    );

    fireEvent.click(screen.getByText('show'));

    expect(loggerMock.warn).toHaveBeenCalledWith(
      '[MessageContext] showMessage called but showMessage is not available on store'
    );
  });
});
