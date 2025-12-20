import type { CommandArgsMap, CommandName, CommandResultMap } from '../../tauri/commands';
import { invokeCommand } from '../../tauri/commands';
import type { Message } from '../slices/uiStateStore';
import { logger } from '../../utils/logger';

type InvokeFn = ((command: string, args?: Record<string, unknown>) => Promise<unknown>) | null | undefined;

type ShowMessage = (text: string, type?: Message['type']) => void;

export type InvokeWithFeedbackOutcome<T> =
  | { status: 'skipped' }
  | { status: 'success'; value: T }
  | { status: 'error'; error: unknown };

export type InvokeWithFeedbackOptions<C extends CommandName> = {
  args?: CommandArgsMap[C];

  showMessage?: ShowMessage;

  successMessage?: string;
  successType?: Message['type'];

  errorMessage?: string | ((error: unknown) => string);
  errorType?: Message['type'];

  logLabel?: string;

  shouldHandleError?: (error: unknown) => boolean;
  onError?: (error: unknown) => void;

  rethrow?: boolean;
};

export async function invokeWithFeedback<C extends CommandName>(
  invoke: InvokeFn,
  cmd: C,
  options: InvokeWithFeedbackOptions<C> = {}
): Promise<InvokeWithFeedbackOutcome<CommandResultMap[C]>> {
  if (!invoke) return { status: 'skipped' };

  const {
    args,
    showMessage,
    successMessage,
    successType = 'success',
    errorMessage,
    errorType = 'error',
    logLabel,
    shouldHandleError = () => true,
    onError,
    rethrow = false
  } = options;

  try {
    // Type assertion needed because TypeScript cannot narrow conditional rest parameters at runtime.
    // Type safety is still enforced at call sites via InvokeWithFeedbackOptions<C>.
    const restArgs = (args === undefined ? [] : [args]) as (
      CommandArgsMap[C] extends undefined ? [] : [CommandArgsMap[C]]
    );
    const value = await invokeCommand(invoke, cmd, ...restArgs);

    if (successMessage && showMessage) {
      showMessage(successMessage, successType);
    }

    return { status: 'success', value };
  } catch (error) {
    if (shouldHandleError(error)) {
      if (logLabel) {
        logger.error(logLabel, error);
      } else {
        logger.error('Failed to invoke command:', cmd, error);
      }

      if (showMessage) {
        if (typeof errorMessage === 'function') {
          showMessage(errorMessage(error), errorType);
        } else if (typeof errorMessage === 'string') {
          showMessage(errorMessage, errorType);
        }
      }
    }

    onError?.(error);

    if (rethrow) {
      throw error;
    }

    return { status: 'error', error };
  }
}
