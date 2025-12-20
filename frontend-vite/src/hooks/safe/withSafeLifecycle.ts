import type React from 'react';

import { logger } from '@/utils/logger';

export function withSafeLifecycle<P extends object>(
    WrappedComponent: React.ComponentClass<P>
): React.ComponentClass<P> {
    class SafeComponent extends WrappedComponent {
        private _mounted = true;

        constructor(props: P) {
            super(props);
            this._mounted = true;
        }

        override componentWillUnmount() {
            this._mounted = false;
            if (super.componentWillUnmount) {
                super.componentWillUnmount();
            }
        }

        override setState(
            stateUpdater: unknown,
            callback?: () => void
        ) {
            if (this._mounted) {
                super.setState(stateUpdater, callback);
            } else {
                logger.warn('[withSafeLifecycle] State update after unmount prevented');
            }
        }

        override forceUpdate(callback?: () => void) {
            if (this._mounted) {
                super.forceUpdate(callback);
            } else {
                logger.warn('[withSafeLifecycle] Force update after unmount prevented');
            }
        }
    }

    SafeComponent.displayName = `withSafeLifecycle(${WrappedComponent.displayName || WrappedComponent.name})`;
    return SafeComponent as React.ComponentClass<P>;
}
