import { useEffect, useState, useCallback, RefObject, useRef } from 'react';

interface UseKeyboardNavOptions {
  itemCount: number;
  onSelect: (index: number) => void;
  onClose?: (index: number) => void;
  enabled?: boolean;
  containerRef?: RefObject<HTMLElement>;
  throttleMs?: number; // Throttle navigation updates
}

export function useKeyboardNav({
  itemCount,
  onSelect,
  onClose,
  enabled = true,
  throttleMs = 16, // Default 16ms (~60fps)
}: UseKeyboardNavOptions) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const lastUpdateTime = useRef<number>(0);
  const pendingUpdate = useRef<number | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      console.log('useKeyboardNav handleKeyDown called:', e.key);

      if (!enabled || itemCount === 0) {
        console.log('Keyboard nav disabled or no items');
        return;
      }

      // Don't interfere with input fields, textareas, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        console.log('Ignoring key in input field');
        return;
      }

      console.log('Processing key:', e.key);

      // Throttled navigation update
      const throttledUpdate = (updateFn: (prev: number) => number) => {
        const now = performance.now();

        if (now - lastUpdateTime.current >= throttleMs) {
          // Enough time passed, update immediately
          setSelectedIndex(updateFn);
          lastUpdateTime.current = now;
        } else {
          // Schedule update for later
          if (pendingUpdate.current !== null) {
            cancelAnimationFrame(pendingUpdate.current);
          }

          pendingUpdate.current = requestAnimationFrame(() => {
            setSelectedIndex(updateFn);
            lastUpdateTime.current = performance.now();
            pendingUpdate.current = null;
          });
        }
      };

      switch (e.key) {
        case 'ArrowDown':
        case 'j': // vim-style
          e.preventDefault();
          throttledUpdate((prev) => {
            const next = Math.min(prev + 1, itemCount - 1);
            console.log('Moving down from', prev, 'to', next);
            return next;
          });
          break;

        case 'ArrowUp':
        case 'k': // vim-style
          e.preventDefault();
          throttledUpdate((prev) => {
            const next = Math.max(prev - 1, 0);
            console.log('Moving up from', prev, 'to', next);
            return next;
          });
          break;

        case 'Home':
          e.preventDefault();
          console.log('Jumping to first item');
          setSelectedIndex(0);
          break;

        case 'End':
          e.preventDefault();
          console.log('Jumping to last item');
          setSelectedIndex(itemCount - 1);
          break;

        case 'Enter':
          e.preventDefault();
          console.log('Selecting item at index', selectedIndex);
          setSelectedIndex((prev) => {
            onSelect(prev);
            return prev;
          });
          break;

        case 'Delete':
        case 'Backspace':
          if (onClose) {
            e.preventDefault();
            console.log('Closing item at index', selectedIndex);
            setSelectedIndex((prev) => {
              onClose(prev);
              // Adjust selection after close
              if (prev >= itemCount - 1) {
                return Math.max(0, itemCount - 2);
              }
              return prev;
            });
          }
          break;

        case 'PageDown':
        case 'fn': // Mac fn+down for PageDown
          e.preventDefault();
          throttledUpdate((prev) => Math.min(prev + 10, itemCount - 1));
          break;

        case 'PageUp':
          e.preventDefault();
          throttledUpdate((prev) => Math.max(prev - 10, 0));
          break;
      }
    },
    [enabled, itemCount, onSelect, onClose, selectedIndex, throttleMs]
  );

  useEffect(() => {
    if (!enabled) {
      console.log('Keyboard nav not enabled, skipping listener setup');
      return;
    }

    // Always use document for Chrome extension popups
    // Container focus is unreliable in popup windows
    console.log('Attaching keydown listener to document');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    document.addEventListener('keydown', handleKeyDown as any);

    return () => {
      console.log('Removing keydown listener from document');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      document.removeEventListener('keydown', handleKeyDown as any);
    };
  }, [enabled, handleKeyDown]);

  // Reset selection when item count changes
  useEffect(() => {
    if (selectedIndex >= itemCount) {
      setSelectedIndex(Math.max(0, itemCount - 1));
    }
  }, [itemCount, selectedIndex]);

  return {
    selectedIndex,
    setSelectedIndex,
  };
}
