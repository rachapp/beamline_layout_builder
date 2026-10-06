import { useEffect, useRef } from 'react';
import { PX_PER_MM_V, SNAP_STEP_M, BEAM_AXIS_PX, canEditElevation, hasManualPosition, isAnchorType } from '../../constants';
import { calculateUpdatedBounds, getItemBoundsM } from '../../utils/constructionUtils';
import { byDistance } from '../../utils/itemFactory';

const isTypingTarget = (el) => {
  const tag = el?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || Boolean(el?.isContentEditable);
};

/**
 * Keyboard shortcuts for the canvas. The full list is shown in the Keyboard Shortcuts dialog
 * (src/components/ShortcutHelp.jsx), which should be kept in sync with this file.
 */
export const useKeyboardShortcuts = (ctx) => {
  // Read the latest state through a ref, so the listener is registered once.
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  useEffect(() => {
    const handleKey = (e) => {
      const {
        setItems, selection, editingLabel, setEditingLabel, placingType, cancelPlacing,
        activeView, lastClickedView, computedItemsRef, deleteSelected, undo, redo,
        handleFitToScreen, isShortcutHelpOpen, setIsShortcutHelpOpen, items
      } = ctxRef.current;
      const mod = e.ctrlKey || e.metaKey;

      if (e.key === 'Escape') {
        if (isShortcutHelpOpen) {
          setIsShortcutHelpOpen(false);
        } else if (placingType || editingLabel) {
          cancelPlacing();
          setEditingLabel(null);
        } else if (!isTypingTarget(document.activeElement)) {
          selection.select(null);
        }
        return;
      }

      // Leave typing (and the browser's own text undo) alone inside form fields.
      if (isTypingTarget(document.activeElement) || editingLabel) return;

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selection.selectMany(items.map(i => i.id));
        return;
      }
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutHelpOpen(open => !open);
        return;
      }
      if (!mod && (e.key === 'f' || e.key === 'F')) {
        handleFitToScreen();
        return;
      }

      const selectedIds = selection.ids;
      if (selectedIds.length === 0) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
        return;
      }

      const targetView = activeView === 'BOTH' ? (lastClickedView || 'SIDE') : activeView;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const direction = e.key === 'ArrowLeft' ? -1 : 1;
        const step = e.shiftKey ? 1.0 : SNAP_STEP_M; // Shift = 1 m, normal = 0.1 m
        setItems(prevItems => prevItems.map(item => {
          if (!selectedIds.includes(item.id) || item.isLocked) return item;
          const currentDist = item.distance ?? getItemBoundsM(item).dist;
          const baseDist = Math.round(currentDist * 10) / 10;
          const newDist = parseFloat((baseDist + direction * step).toFixed(1));
          const constraint = item.lockLength ? 'LOCK_LENGTH' : (item.lockCenter ? 'LOCK_CENTER' : 'ADJUST_LENGTH');
          return calculateUpdatedBounds(item, 'distance', newDist, constraint);
        }).sort(byDistance));
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const direction = e.key === 'ArrowUp' ? 1 : -1; // Up = higher elevation / smaller offset
        setItems(prevItems => prevItems.map(item => {
          if (!selectedIds.includes(item.id) || item.isLocked) return item;
          // Only items with a user-set elevation/offset move vertically; optics follow the beam path.
          if (!hasManualPosition(item.type)) return item;

          const comp = computedItemsRef.current?.find(c => c.id === item.id);
          // Side anchors always adjust height, top anchors always adjust offset, others follow the view.
          const adjustHeight = item.type === 'ANCHOR_SIDE' || (item.type !== 'ANCHOR_TOP' && targetView === 'SIDE');
          if (adjustHeight && !canEditElevation(item.type)) return item;
          const isAnchor = isAnchorType(item.type);
          const stepMm = isAnchor ? (e.shiftKey ? 1.0 : 0.1) : (e.shiftKey ? 10 : 1);
          const followsBeam = item.type === 'DETECTOR' && item.stayInPath !== false;

          if (adjustHeight) {
            const currentH = (followsBeam && comp?.y !== undefined)
              ? (BEAM_AXIS_PX - comp.y) / PX_PER_MM_V
              : (item.height !== undefined ? Number(item.height) : (BEAM_AXIS_PX - (item.y ?? BEAM_AXIS_PX)) / PX_PER_MM_V);
            const newH = parseFloat((Math.round(currentH * 10) / 10 + direction * stepMm).toFixed(1));
            return {
              ...item,
              height: newH,
              y: BEAM_AXIS_PX - newH * PX_PER_MM_V,
              ...(item.type === 'DETECTOR' ? { stayInPath: false } : {})
            };
          }
          const currentO = (followsBeam && comp?.z !== undefined)
            ? (comp.z - BEAM_AXIS_PX) / PX_PER_MM_V
            : (item.offset !== undefined ? Number(item.offset) : ((item.z ?? BEAM_AXIS_PX) - BEAM_AXIS_PX) / PX_PER_MM_V);
          const newO = parseFloat((Math.round(currentO * 10) / 10 - direction * stepMm).toFixed(1));
          return {
            ...item,
            offset: newO,
            z: BEAM_AXIS_PX + newO * PX_PER_MM_V,
            ...(item.type === 'DETECTOR' ? { stayInPath: false } : {})
          };
        }));
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);
};
