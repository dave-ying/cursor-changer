import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

describe('CursorCustomization/FileUpload/BrowseModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    if (!(globalThis as any).DataTransfer) {
      class DT {
        items = {
          add: (_file: File) => {},
        };
        files: FileList;
        constructor() {
          const fileList: any = {
            length: 0,
            item: () => null,
          };
          this.files = fileList as FileList;
        }
      }
      (globalThis as any).DataTransfer = DT;
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

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

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
});
