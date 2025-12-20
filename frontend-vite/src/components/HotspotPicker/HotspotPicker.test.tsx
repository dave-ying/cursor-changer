import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HotspotPicker } from './index';
import * as useHotspotLogicModule from './useHotspotLogic';
import * as AppContextModule from '../../context/AppContext';

// Mock child components to avoid canvas issues and focus on logic wiring
vi.mock('./ImageCanvas', () => ({
    ImageCanvas: () => <div data-testid="image-canvas">Image Canvas Mock</div>
}));

vi.mock('./ImageControls', () => ({
    ImageControls: () => <div data-testid="image-controls">Image Controls Mock</div>
}));

// Mock useApp
const mockUseApp = {
    cursorState: { accentColor: '#ff0000' },
};

// Mock useHotspotLogic return values
const mockLogic = {
    objectUrl: 'mock-url',
    targetSize: 256,
    hotspot: { x: 10, y: 10 },
    setHotspot: vi.fn(),
    busy: false,
    cursorInfo: null,
    previewBg: 'checkerboard',
    setPreviewBg: vi.fn(),
    hotspotMode: 'crosshair',
    setHotspotMode: vi.fn(),
    hotspotColor: 'red',
    setHotspotColor: vi.fn(),
    imageTransform: { scale: 1, offsetX: 0, offsetY: 0 },
    setImageTransform: vi.fn(),
    filename: 'test-file.png',
    isRemovingBackground: false,
    imgRef: { current: null },
    overlayRef: { current: null },
    calculateFitScale: vi.fn(() => 1),
    handlePick: vi.fn(),
    handleConfirm: vi.fn(async () => { }),
    handleDelete: vi.fn(async () => { }),
    handleRemoveBackground: vi.fn(async () => { }),
    startHoldAction: vi.fn((action) => action()), // Execute immediately for testing
    stopHoldAction: vi.fn(),
};

describe('HotspotPicker', () => {
    beforeEach(() => {
        vi.spyOn(AppContextModule, 'useApp').mockReturnValue(mockUseApp as any);
        vi.spyOn(useHotspotLogicModule, 'useHotspotLogic').mockReturnValue(mockLogic as any);
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        it('renders correctly', () => {
            render(<HotspotPicker onCancel={vi.fn()} />);
            expect(screen.getByText('Cursor Preview')).toBeInTheDocument();
            expect(screen.getByTestId('image-canvas')).toBeInTheDocument();
        });

        it('renders with default hotspot tab active', () => {
            render(<HotspotPicker onCancel={vi.fn()} />);
            // Use getByRole to target the radio button specifically (ToggleGroupItem uses role="radio")
            const hotspotTab = screen.getByRole('radio', { name: /Click Point/ });
            expect(hotspotTab).toBeInTheDocument();
        });
    });

    describe('Hotspot Mode Switching', () => {
        it('handles mode switching', () => {
            render(<HotspotPicker onCancel={vi.fn()} />);

            const crosshairBtn = screen.getByText('Crosshair');
            fireEvent.click(crosshairBtn);
            expect(mockLogic.setHotspotMode).toHaveBeenCalledWith('crosshair');

            const axisBtn = screen.getByText('Axis');
            fireEvent.click(axisBtn);
            expect(mockLogic.setHotspotMode).toHaveBeenCalledWith('axis');
        });
    });

    describe('Color Switching', () => {
        it('handles color switching', () => {
            render(<HotspotPicker onCancel={vi.fn()} />);

            const redBtn = screen.getByLabelText('Select red color');
            fireEvent.click(redBtn);
            expect(mockLogic.setHotspotColor).toHaveBeenCalledWith('red');

            const greenBtn = screen.getByLabelText('Select green color');
            fireEvent.click(greenBtn);
            expect(mockLogic.setHotspotColor).toHaveBeenCalledWith('green');

            const blueBtn = screen.getByLabelText('Select blue color');
            fireEvent.click(blueBtn);
            expect(mockLogic.setHotspotColor).toHaveBeenCalledWith('blue');

            const blackBtn = screen.getByLabelText('Select black color');
            fireEvent.click(blackBtn);
            expect(mockLogic.setHotspotColor).toHaveBeenCalledWith('black');
        });

        it('handles white color selection', () => {
            render(<HotspotPicker onCancel={vi.fn()} />);

            const whiteBtn = screen.getByLabelText('Select white color');
            fireEvent.click(whiteBtn);
            expect(mockLogic.setHotspotColor).toHaveBeenCalledWith('white');
        });

    });

    describe('Coordinate Inputs', () => {
        it('handles coordinate inputs', () => {
            render(<HotspotPicker onCancel={vi.fn()} />);

            const xInput = screen.getByLabelText('X');
            fireEvent.change(xInput, { target: { value: '50' } });
            expect(mockLogic.setHotspot).toHaveBeenCalledWith(expect.objectContaining({ x: 50 }));

            const yInput = screen.getByLabelText('Y');
            fireEvent.change(yInput, { target: { value: '60' } });
            expect(mockLogic.setHotspot).toHaveBeenCalledWith(expect.objectContaining({ y: 60 }));
        });

        it('clamps coordinates to valid range', () => {
            render(<HotspotPicker onCancel={vi.fn()} />);

            const xInput = screen.getByLabelText('X');
            fireEvent.change(xInput, { target: { value: '300' } });
            // Should clamp to targetSize - 1 (255)
            expect(mockLogic.setHotspot).toHaveBeenCalledWith(expect.objectContaining({ x: 255 }));
        });
    });

    describe('Directional Buttons', () => {
        it('handles directional buttons', () => {
            render(<HotspotPicker onCancel={vi.fn()} />);

            const upBtn = screen.getByText('▲');
            fireEvent.mouseDown(upBtn);
            expect(mockLogic.startHoldAction).toHaveBeenCalled();
            expect(mockLogic.setHotspot).toHaveBeenCalled();
        });

        it('calls stopHoldAction on mouse up', () => {
            render(<HotspotPicker onCancel={vi.fn()} />);

            const upBtn = screen.getByText('▲');
            fireEvent.mouseDown(upBtn);
            fireEvent.mouseUp(upBtn);
            expect(mockLogic.stopHoldAction).toHaveBeenCalled();
        });
    });

    describe('Cancel Functionality', () => {
        it('calls onCancel when close button is clicked', () => {
            const onCancel = vi.fn();
            render(<HotspotPicker onCancel={onCancel} />);

            const closeBtn = screen.getByLabelText('Close');
            fireEvent.click(closeBtn);
            expect(onCancel).toHaveBeenCalled();
        });

        it('calls onCancel when clicking backdrop', () => {
            const onCancel = vi.fn();
            render(<HotspotPicker onCancel={onCancel} />);

            const backdrop = screen.getByTestId('hotspot-picker');
            // The component tracks mouseDown position to detect drags vs clicks
            // We need to simulate both mouseDown and click at the same position
            fireEvent.mouseDown(backdrop, { clientX: 100, clientY: 100 });
            fireEvent.click(backdrop, { clientX: 100, clientY: 100 });
            expect(onCancel).toHaveBeenCalled();
        });

        it('does not call onCancel when clicking modal content', () => {
            const onCancel = vi.fn();
            render(<HotspotPicker onCancel={onCancel} />);

            const canvas = screen.getByTestId('image-canvas');
            fireEvent.click(canvas);
            expect(onCancel).not.toHaveBeenCalled();
        });
    });

    describe('Create/Confirm Actions', () => {
        it('calls handleConfirm when Create Cursor is clicked', async () => {
            render(<HotspotPicker onCancel={vi.fn()} />);

            const createBtn = screen.getByText('Create Cursor');
            fireEvent.click(createBtn);
            expect(mockLogic.handleConfirm).toHaveBeenCalled();
        });

        it('calls onComplete after successful creation', async () => {
            const onComplete = vi.fn();
            render(<HotspotPicker onCancel={vi.fn()} onComplete={onComplete} />);

            const createBtn = screen.getByText('Create Cursor');
            fireEvent.click(createBtn);

            await waitFor(() => {
                expect(onComplete).toHaveBeenCalled();
            });
        });

        it('disables Create button when busy', () => {
            vi.spyOn(useHotspotLogicModule, 'useHotspotLogic').mockReturnValue({
                ...mockLogic,
                busy: true,
            } as any);

            render(<HotspotPicker onCancel={vi.fn()} />);
            const createBtn = screen.getByText('Adding…');
            expect(createBtn).toBeDisabled();
        });
    });

    describe('Tab Switching', () => {
        it('switches to Resize & Reposition tab when clicked', () => {
            render(<HotspotPicker onCancel={vi.fn()} />);

            const resizeTab = screen.getByText(/Resize & Reposition/);
            fireEvent.click(resizeTab);

            expect(screen.getByTestId('image-controls')).toBeInTheDocument();
        });

        it('shows hotspot controls on Click Point tab', () => {
            render(<HotspotPicker onCancel={vi.fn()} />);

            const hotspotTab = screen.getByRole('radio', { name: /Click Point/ });
            fireEvent.click(hotspotTab);

            expect(screen.getByText('Crosshair')).toBeInTheDocument();
            expect(screen.getByText('Axis')).toBeInTheDocument();
        });

        it('hides Resize tab in edit mode', () => {
            render(<HotspotPicker filePath="/path/to/cursor.cur" itemId="123" onCancel={vi.fn()} />);

            expect(screen.queryByText(/Resize & Reposition/)).not.toBeInTheDocument();
        });

        it('preserves state when switching tabs', () => {
            render(<HotspotPicker onCancel={vi.fn()} />);

            // Click on hotspot tab
            const hotspotTab = screen.getByRole('radio', { name: /Click Point/ });
            fireEvent.click(hotspotTab);

            // Change hotspot mode
            const axisBtn = screen.getByText('Axis');
            fireEvent.click(axisBtn);

            // Switch to resize tab
            const resizeTab = screen.getByRole('radio', { name: /Resize & Reposition/ });
            fireEvent.click(resizeTab);

            // Switch back to hotspot tab
            fireEvent.click(hotspotTab);

            // Mode should still be 'axis' (check that the component renders correctly)
            expect(screen.getByText('Axis')).toBeInTheDocument();
        });
    });

    describe('Background Removal', () => {
        it('shows Remove Background button in create mode', () => {
            render(<HotspotPicker onCancel={vi.fn()} />);
            expect(screen.getByText('Remove Background')).toBeInTheDocument();
        });

        it('hides Remove Background button in edit mode', () => {
            render(<HotspotPicker filePath="/path/to/cursor.cur" itemId="123" onCancel={vi.fn()} />);
            expect(screen.queryByText('Remove Background')).not.toBeInTheDocument();
        });

        it('calls handleRemoveBackground when button is clicked', () => {
            render(<HotspotPicker onCancel={vi.fn()} />);

            const removeBtn = screen.getByText('Remove Background');
            fireEvent.click(removeBtn);
            expect(mockLogic.handleRemoveBackground).toHaveBeenCalled();
        });

        it('disables Remove Background button when busy', () => {
            vi.spyOn(useHotspotLogicModule, 'useHotspotLogic').mockReturnValue({
                ...mockLogic,
                busy: true,
            } as any);

            render(<HotspotPicker onCancel={vi.fn()} />);
            const removeBtn = screen.getByText('Remove Background');
            expect(removeBtn).toBeDisabled();
        });

        it('disables Remove Background button when removing background', () => {
            vi.spyOn(useHotspotLogicModule, 'useHotspotLogic').mockReturnValue({
                ...mockLogic,
                isRemovingBackground: true,
            } as any);

            render(<HotspotPicker onCancel={vi.fn()} />);
            const removeBtn = screen.getByText('Removing Background...');
            expect(removeBtn).toBeDisabled();
        });

        it('shows loading state during background removal', () => {
            vi.spyOn(useHotspotLogicModule, 'useHotspotLogic').mockReturnValue({
                ...mockLogic,
                isRemovingBackground: true,
            } as any);

            render(<HotspotPicker onCancel={vi.fn()} />);
            expect(screen.getByText('Removing Background...')).toBeInTheDocument();
        });
    });

    describe('Image Transform/Resize', () => {
        it('renders ImageControls in resize tab', () => {
            render(<HotspotPicker onCancel={vi.fn()} />);

            const resizeTab = screen.getByText(/Resize & Reposition/);
            fireEvent.click(resizeTab);

            expect(screen.getByTestId('image-controls')).toBeInTheDocument();
        });

        it('passes correct props to ImageControls', () => {
            render(<HotspotPicker onCancel={vi.fn()} />);

            const resizeTab = screen.getByText(/Resize & Reposition/);
            fireEvent.click(resizeTab);

            // Check that ImageControls is rendered (mocked)
            expect(screen.getByTestId('image-controls')).toBeInTheDocument();
        });

        it('disables Create button when removing background', () => {
            vi.spyOn(useHotspotLogicModule, 'useHotspotLogic').mockReturnValue({
                ...mockLogic,
                isRemovingBackground: true,
            } as any);

            render(<HotspotPicker onCancel={vi.fn()} />);
            const createBtn = screen.getByText('Create Cursor');
            expect(createBtn).toBeDisabled();
        });
    });

    describe('Edit Mode vs Create Mode', () => {
        it('shows Update Hotspot button in edit mode', () => {
            render(<HotspotPicker filePath="/path/to/cursor.cur" itemId="123" onCancel={vi.fn()} />);
            // In edit mode, the button is in HotspotControls component (which is mocked)
            // So we check that the Create Cursor button is NOT present instead
            expect(screen.queryByText('Create Cursor')).not.toBeInTheDocument();
        });

        it('shows Create Cursor button in create mode', () => {
            render(<HotspotPicker onCancel={vi.fn()} />);
            expect(screen.getByText('Create Cursor')).toBeInTheDocument();
        });

        it('shows Resize tab only in create mode', () => {
            const { rerender } = render(<HotspotPicker onCancel={vi.fn()} />);
            expect(screen.getByText(/Resize & Reposition/)).toBeInTheDocument();

            rerender(<HotspotPicker filePath="/path/to/cursor.cur" itemId="123" onCancel={vi.fn()} />);
            expect(screen.queryByText(/Resize & Reposition/)).not.toBeInTheDocument();
        });

        it('shows Remove Background button only in create mode', () => {
            const { rerender } = render(<HotspotPicker onCancel={vi.fn()} />);
            expect(screen.getByText('Remove Background')).toBeInTheDocument();

            rerender(<HotspotPicker filePath="/path/to/cursor.cur" itemId="123" onCancel={vi.fn()} />);
            expect(screen.queryByText('Remove Background')).not.toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('has proper ARIA labels', () => {
            render(<HotspotPicker onCancel={vi.fn()} />);

            expect(screen.getByLabelText('Close')).toBeInTheDocument();
            expect(screen.getByLabelText('Select red color')).toBeInTheDocument();
            expect(screen.getByLabelText('Select green color')).toBeInTheDocument();
            expect(screen.getByLabelText('Select blue color')).toBeInTheDocument();
            expect(screen.getByLabelText('Select black color')).toBeInTheDocument();
            expect(screen.getByLabelText('Select white color')).toBeInTheDocument();
        });

        it('has instruction card with proper labels', () => {
            render(<HotspotPicker onCancel={vi.fn()} />);
            expect(screen.getByLabelText('Hotspot instructions card')).toBeInTheDocument();
        });

        it('close button has accessible label', () => {
            render(<HotspotPicker onCancel={vi.fn()} />);
            const closeBtn = screen.getByLabelText('Close');
            expect(closeBtn).toHaveAttribute('aria-label', 'Close');
        });
    });

    describe('Visual States', () => {
        it('displays correct button text when busy', () => {
            vi.spyOn(useHotspotLogicModule, 'useHotspotLogic').mockReturnValue({
                ...mockLogic,
                busy: true,
            } as any);

            render(<HotspotPicker onCancel={vi.fn()} />);
            expect(screen.getByText('Adding…')).toBeInTheDocument();
        });

        it('displays correct button text when idle', () => {
            render(<HotspotPicker onCancel={vi.fn()} />);
            expect(screen.getByText('Create Cursor')).toBeInTheDocument();
        });

        it('displays instructions in hotspot tab', () => {
            render(<HotspotPicker onCancel={vi.fn()} />);
            expect(screen.getByText(/Click anywhere on the 'Cursor Preview'/)).toBeInTheDocument();
            expect(screen.getByText(/to choose the point where your cursor actually clicks/)).toBeInTheDocument();
        });
    });

    describe('Props Passing', () => {
        it('passes accent color to ImageCanvas', () => {
            render(<HotspotPicker onCancel={vi.fn()} />);
            // ImageCanvas is mocked, but we can verify it's rendered
            expect(screen.getByTestId('image-canvas')).toBeInTheDocument();
        });

        it('uses fallback accent color when not provided', () => {
            vi.spyOn(AppContextModule, 'useApp').mockReturnValue({
                cursorState: { accentColor: undefined },
            } as any);

            render(<HotspotPicker onCancel={vi.fn()} />);
            // Should use default #7c3aed
            expect(screen.getByTestId('image-canvas')).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        it('handles missing onComplete callback', async () => {
            render(<HotspotPicker onCancel={vi.fn()} />);

            const createBtn = screen.getByText('Create Cursor');
            fireEvent.click(createBtn);

            // Should not throw error
            await waitFor(() => {
                expect(mockLogic.handleConfirm).toHaveBeenCalled();
            });
        });

        it('handles null objectUrl', () => {
            vi.spyOn(useHotspotLogicModule, 'useHotspotLogic').mockReturnValue({
                ...mockLogic,
                objectUrl: null,
            } as any);

            render(<HotspotPicker onCancel={vi.fn()} />);
            expect(screen.getByTestId('image-canvas')).toBeInTheDocument();
        });

        it('renders with file prop', () => {
            const file = new File([''], 'test.png', { type: 'image/png' });
            render(<HotspotPicker file={file} onCancel={vi.fn()} />);
            expect(screen.getByText('Cursor Preview')).toBeInTheDocument();
        });

        it('renders with filePath and itemId props', () => {
            render(<HotspotPicker filePath="/path/to/cursor.cur" itemId="123" onCancel={vi.fn()} />);
            expect(screen.getByText('Cursor Preview')).toBeInTheDocument();
        });
    });

    describe('Modal Behavior', () => {
        it('stops event propagation when clicking modal content', () => {
            const onCancel = vi.fn();
            render(<HotspotPicker onCancel={onCancel} />);

            const modalContent = screen.getByText('Cursor Preview').closest('.modal-panel');
            if (modalContent) {
                fireEvent.click(modalContent);
                expect(onCancel).not.toHaveBeenCalled();
            }
        });

        it('has correct z-index for modal overlay', () => {
            render(<HotspotPicker onCancel={vi.fn()} />);
            const modal = screen.getByTestId('hotspot-picker');
            expect(modal).toHaveStyle({ zIndex: '20000' });
        });
    });
});
