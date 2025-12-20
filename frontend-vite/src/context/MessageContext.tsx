import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { logger } from '../utils/logger';

interface MessageContextValue {
  // Message state
  message: {
    text: string;
    type: 'info' | 'success' | 'error' | 'warning' | '';
  };

  // Toast functions
  addToast: (text: string, type?: 'info' | 'success' | 'error' | 'warning', duration?: number) => void;

  // Message operations
  showMessage: (text: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

const MessageContext = createContext<MessageContextValue | null>(null);

interface MessageProviderProps {
  children: ReactNode;
}

export function MessageProvider({ children }: MessageProviderProps) {
  const message = useAppStore((s) => s.message);
  const storeAddToast = useAppStore((s) => s.addToast);
  const storeShowMessage = useAppStore((s) => s.showMessage);
  const storeClearMessage = useAppStore((s) => s.clearMessage);

  const addToast = useCallback(
    (text: string, type: 'info' | 'success' | 'error' | 'warning' = 'info', duration: number = 5000) => {
      if (typeof storeAddToast === 'function') {
        storeAddToast(text, type, duration);
      } else {
        logger.warn('[MessageContext] addToast called but addToast is not available on store');
      }
    },
    [storeAddToast]
  );

  const showMessage = useCallback(
    (text: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
      logger.debug('[MessageContext] showMessage called:', text, type);

      if (typeof storeShowMessage === 'function') {
        storeShowMessage(text, type);
        logger.debug('[MessageContext] Legacy message set');

        if (typeof storeAddToast === 'function') {
          logger.debug('[MessageContext] Adding toast:', text, type);
          storeAddToast(text, type, 4000);
        } else {
          logger.warn('[MessageContext] addToast function not available');
        }

        setTimeout(() => {
          if (typeof storeClearMessage === 'function') {
            storeClearMessage();
          }
        }, 5000);
      } else {
        logger.warn('[MessageContext] showMessage called but showMessage is not available on store');
      }
    },
    [storeAddToast, storeClearMessage, storeShowMessage]
  );

  const value: MessageContextValue = {
    message: message || { text: '', type: '' },
    addToast,
    showMessage
  };

  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>;
}

export function useMessage() {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessage must be used within MessageProvider');
  }
  return context;
}