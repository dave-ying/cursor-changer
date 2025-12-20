import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { logger } from '../../../utils/logger';

/**
 * BrowseModal
 *
 * This component is now a "dumb" / presentational modal.
 * - It no longer creates its own useFileUpload instance.
 * - It relies entirely on the controlled isOpen/onClose/onImageFileSelected props
 *   provided by the parent CursorCustomization component.
 *
 * This prevents double hook state and fixes the stuck modal behavior.
 */
interface BrowseModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onImageFileSelected?: (file: File, clickPointItemId: string) => void;
  handleFileSelect?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  clickPointItemId?: string;
}

const SUPPORTED_EXTENSIONS = ['cur', 'ani', 'svg', 'png', 'ico', 'bmp', 'jpg', 'jpeg'];
const SUPPORTED_IMAGE_EXTENSIONS = ['svg', 'png', 'ico', 'bmp', 'jpg', 'jpeg'];

export function BrowseModal({
  isOpen,
  onClose,
  onImageFileSelected,
  handleFileSelect,
  clickPointItemId
}: BrowseModalProps) {
  const [isDragging, setIsDragging] = useState(false);

  // Only render if modal should be open
  if (!isOpen) return null;

  const handleClose = () => {
    onClose?.();
  };

  const processFile = (file: File) => {
    const name = file.name || '';
    const ext = (name.split('.').pop() || '').toLowerCase();

    // Validate file extension
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      logger.warn(`Unsupported file type: .${ext}`);
      return;
    }

    // For image files, bubble up to parent so it can open HotspotPicker
    if (SUPPORTED_IMAGE_EXTENSIONS.includes(ext)) {
      onImageFileSelected?.(file, clickPointItemId || '');
      onClose?.();
      return;
    }

    // For .cur / .ani files, create a synthetic event to pass to handleFileSelect
    if (handleFileSelect) {
      // Create a DataTransfer to build a FileList
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      // Create a synthetic event-like object
      const syntheticEvent = {
        target: {
          files: dataTransfer.files
        }
      } as React.ChangeEvent<HTMLInputElement>;
      
      handleFileSelect(syntheticEvent);
    } else {
      logger.warn('handleFileSelect function not provided to BrowseModal');
    }
    onClose?.();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone entirely
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files.item(0);
      if (file) processFile(file);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-[2px]"
      onClick={handleClose}
    >
      {/* Modal container with responsive width and natural height */}
      <Card
        className="relative w-[55vw] max-w-2xl overflow-hidden shadow-lg flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with title and close button in the same row */}
        <div className="flex items-center justify-between p-6">
          <h2 className="text-2xl font-bold text-foreground">
            Add Cursor
          </h2>

          {/* Close button in the header row */}
          <Button
            onClick={handleClose}
            variant="ghost"
            size="icon"
            id="modal-close-button"
            className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-[#e81123] hover:text-white"
            aria-label="Close upload modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="size-4">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Subtitle in separate row */}
        <div className="px-6 pb-6">
          <p className="text-sm text-muted-foreground">
            Upload a cursor or image file (.cur, .ani, .svg, .png, .ico, .bmp, .jpg, .jpeg)
          </p>
        </div>

        {/* Body */}
        <CardContent className="pt-2 pb-8 flex-1 flex items-center justify-center">
          {/* Drop area with compact, focused design and accessibility */}
          <label
            className={`group flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-6 text-center transition-all min-h-[140px] w-full max-w-lg cursor-pointer ${
              isDragging
                ? 'border-primary bg-primary/10 scale-[1.02]'
                : 'border-border bg-muted/30 hover:border-primary hover:bg-accent/50'
            }`}
            role="button"
            tabIndex={0}
            aria-label="File upload area. Click to browse for files or drag and drop cursor files here. Supports .cur, .ani, .svg, .png, .ico, .bmp, .jpg, .jpeg files."
            aria-describedby="upload-description"
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              className="hidden"
              accept=".cur,.ani,.svg,.png,.ico,.bmp,.jpg,.jpeg"
              onChange={handleFileChange}
              aria-label="Hidden file input for cursor upload"
            />
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  d="M12 5v9m0-9-3 3m3-3 3 3M6 13v4.5A1.5 1.5 0 0 0 7.5 19h9A1.5 1.5 0 0 0 18 17.5V13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="space-y-0.5" id="upload-description">
              <p className="text-base font-medium text-foreground">
                Click to browse files
              </p>
              <p className="text-sm text-muted-foreground">
                or drag and drop here
              </p>
            </div>
          </label>
        </CardContent>
      </Card>
    </div>
  );
}