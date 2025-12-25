import { usePersistentState, type UsePersistentStateOptions } from './usePersistentState';

const defaultSerializeBoolean = (value: boolean) => String(value);
const defaultDeserializeBoolean = (stored: string) => stored === 'true';

interface UsePersistentBooleanOptions extends UsePersistentStateOptions<boolean> {}

/**
 * Boolean-specialized helper over {@link usePersistentState}.
 */
export function usePersistentBoolean(options: UsePersistentBooleanOptions) {
  return usePersistentState<boolean>({
    serialize: defaultSerializeBoolean,
    deserialize: defaultDeserializeBoolean,
    ...options
  });
}
