import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => { })),
}));

describe('CursorCustomization/FileUpload/BrowseModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    if (!(globalThis as any).DataTransfer) {
      (globalThis as any).DataTransfer = class {
        files: FileList;
        items: { add: (file: File) => void };

        constructor() {
          const filesArray: any[] & { item?: (index: number) => File | null } = [];
          filesArray.item = (index: number) => filesArray[index] ?? null;
          this.files = filesArray as unknown as FileList;
          this.items = {
            add: (file: File) => {
              filesArray.push(file);
            }
          };
        }
      };
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when closed', async () => {
    const { BrowseModal } = await import('@/components/CursorCustomization/FileUpload/BrowseModal');
    const { container } = render(<BrowseModal isOpen={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('calls onClose when clicking backdrop or close button', async () => {
    const { BrowseModal } = await import('@/components/CursorCustomization/FileUpload/BrowseModal');

    const onClose = vi.fn();

    const { container } = render(
      <BrowseModal isOpen={true} onClose={onClose} />
    );

    fireEvent.click(screen.getByLabelText('Close upload modal'));
    expect(onClose).toHaveBeenCalledTimes(1);

    // Backdrop click closes as well
    fireEvent.click(container.firstElementChild as Element);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('routes image files to onImageFileSelected and closes', async () => {
    const { BrowseModal } = await import('@/components/CursorCustomization/FileUpload/BrowseModal');

    const onClose = vi.fn();
    const onImageFileSelected = vi.fn();

    render(
      <BrowseModal
        isOpen={true}
        onClose={onClose}
        onImageFileSelected={onImageFileSelected}
        clickPointItemId="id1"
      />
    );

    const input = screen.getByLabelText('Hidden file input for cursor upload') as HTMLInputElement;

    const file = new File([new Uint8Array([1])], 'x.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(onImageFileSelected).toHaveBeenCalledWith(file, 'id1');
    expect(onClose).toHaveBeenCalled();
  });

  it('routes .cur files to handleFileSelect and closes', async () => {
    const { BrowseModal } = await import('@/components/CursorCustomization/FileUpload/BrowseModal');

    const onClose = vi.fn();
    const handleFileSelect = vi.fn();

    render(
      <BrowseModal isOpen={true} onClose={onClose} handleFileSelect={handleFileSelect} />
    );

    const input = screen.getByLabelText('Hidden file input for cursor upload') as HTMLInputElement;
    const file = new File([new Uint8Array([1])], 'x.cur', { type: 'application/octet-stream' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(handleFileSelect).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('ignores unsupported extension and does not close', async () => {
    const { BrowseModal } = await import('@/components/CursorCustomization/FileUpload/BrowseModal');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

    const onClose = vi.fn();
    const handleFileSelect = vi.fn();

    render(
      <BrowseModal isOpen={true} onClose={onClose} handleFileSelect={handleFileSelect} />
    );

    const input = screen.getByLabelText('Hidden file input for cursor upload') as HTMLInputElement;
    const file = new File([new Uint8Array([1])], 'x.xyz', { type: 'application/octet-stream' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(warnSpy).toHaveBeenCalled();
    expect(handleFileSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('handles drag events and drop processing for supported files', async () => {
    const { BrowseModal } = await import('@/components/CursorCustomization/FileUpload/BrowseModal');

    const onClose = vi.fn();
    const onImageFileSelected = vi.fn();

    render(
      <BrowseModal
        isOpen={true}
        onClose={onClose}
        onImageFileSelected={onImageFileSelected}
        clickPointItemId="drop-id"
      />
    );

    const dropZone = screen.getByLabelText(/File upload area/i);

    const file = new File([new Uint8Array([5])], 'drop.png', { type: 'image/png' });
    const files = {
      length: 1,
      item: () => file
    };

    fireEvent.drop(dropZone, {
      dataTransfer: { files }
    });

    expect(onImageFileSelected).toHaveBeenCalledWith(file, 'drop-id');
    expect(onClose).toHaveBeenCalled();
  });

  it('supports keyboard accessibility (Enter triggers input, Escape closes)', async () => {
    const { BrowseModal } = await import('@/components/CursorCustomization/FileUpload/BrowseModal');

    const onClose = vi.fn();

    render(
      <BrowseModal
        isOpen={true}
        onClose={onClose}
        handleFileSelect={vi.fn()}
      />
    );

    const dropZone = screen.getByLabelText(/File upload area/i);
    const input = screen.getByLabelText('Hidden file input for cursor upload');
    const clickSpy = vi.spyOn(input, 'click');

    fireEvent.keyDown(dropZone, { key: 'Enter' });
    expect(clickSpy).toHaveBeenCalled();

    fireEvent.keyDown(dropZone, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);

    clickSpy.mockRestore();
  });
});
