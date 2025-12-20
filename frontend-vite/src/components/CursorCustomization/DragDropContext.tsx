import React from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { logger } from '../../utils/logger';

/**
 * DragDropContext component - handles all drag and drop functionality
 * Extracted from MainLayout for better separation of concerns
 */
interface DragDropContextProps {
  children: React.ReactNode;
  draggingLib: any;
  setDraggingLib: (lib: any) => void;
  handleDragEnd: (event: any) => void;
}

export function DragDropContext({
  children,
  draggingLib,
  setDraggingLib,
  handleDragEnd
}: DragDropContextProps) {
  // Configure drag sensors: immediate drag activation (no delay)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5 // Start drag after moving 5px
      }
    })
  );

  return (
    <DndContext
      sensors={sensors}
      accessibility={{
        announcements: {
          onDragStart: () => '',
          onDragOver: () => '',
          onDragEnd: () => '',
          onDragCancel: () => ''
        },
        screenReaderInstructions: {
          draggable: ''
        }
      }}
      onDragStart={({ active }) => {
        try {
          const data = active?.data?.current;
          if (data?.['type'] === 'library' && data?.['lib']) {
            setDraggingLib(data['lib']);
          } else {
            setDraggingLib(null);
          }
        } catch (error) {
          logger.warn('[DragDropContext] Drag start error:', error);
        }
      }}
      onDragEnd={(event) => {
        try {
          handleDragEnd(event);
        } catch (error) {
          logger.warn('[DragDropContext] Drag end error:', error);
        }
      }}
    >
      {children}

      {/* Drag overlay */}
      <DragOverlay>
        {draggingLib && (
          <div style={{ pointerEvents: 'none' }}>
            <div style={{
              width: 'clamp(64px, 8vw, 96px)',
              height: 'clamp(64px, 8vw, 96px)',
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: '0 6px 18px rgba(0,0,0,0.4)',
              background: 'var(--bg-hover)'
            }}>
              {draggingLib.preview ? (
                <img src={draggingLib.preview} alt={draggingLib.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>⤴</div>
              )}
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}