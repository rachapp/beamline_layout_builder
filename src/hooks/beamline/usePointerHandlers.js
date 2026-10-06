import { useState, useRef, useEffect } from 'react';
import {
  TYPES, ORIGIN_X, PX_PER_M, PX_PER_MM_V, GRID_SIZE, SNAP_STEP_M, BEAM_AXIS_PX, FLOOR_PX,
  isRangeType, isWallType
} from '../../constants';
import { getItemVisualHeight } from '../../utils';
import { calculateUpdatedBounds, getItemBoundsM, getItemLengthM } from '../../utils/constructionUtils';
import { createPlacedItem, byDistance } from '../../utils/itemFactory';

// A press that moves less than this (in screen px) is a click, not a drag.
const DRAG_THRESHOLD_PX = 4;

const isMultiSelectModifier = (e) => Boolean(e?.shiftKey || e?.ctrlKey || e?.metaKey);

/** Snaps a canvas point to 0.1 m along the beam and 5 mm across it. */
const snapPoint = (rawX, rawSecondary, view) => {
  const snappedDist = Math.round(((rawX - ORIGIN_X) / PX_PER_M) / SNAP_STEP_M) * SNAP_STEP_M;
  const x = ORIGIN_X + snappedDist * PX_PER_M;
  const sign = view === 'SIDE' ? -1 : 1; // SIDE: up is negative canvas Y; TOP: outboard is positive Z
  const mm = (sign * (rawSecondary - BEAM_AXIS_PX)) / PX_PER_MM_V;
  const snappedMm = Math.round(mm / 5) * 5;
  return { x, secondary: BEAM_AXIS_PX + sign * snappedMm * PX_PER_MM_V };
};

const boundsConstraint = (item) => (item.lockLength ? 'LOCK_LENGTH' : (item.lockCenter ? 'LOCK_CENTER' : 'ADJUST_LENGTH'));

/**
 * Mouse/pointer interaction on the canvas: placing new components, dragging components
 * (one or a whole selection), resizing walls/hutches, dragging labels, and panning.
 * Pointer moves are applied at most once per animation frame.
 */
export const usePointerHandlers = ({
  items, setItems, computedItemsRef,
  camera, snapToGrid,
  placingType, setPlacingType, setGhostPos, ghostBranch, setGhostBranch,
  selection, setLastClickedView,
  editingLabel, setEditingLabel
}) => {
  const { zoom, pan, setPan, topViewRef, sideViewRef, cancelFocusItem, scheduleFocus, markViewMoved } = camera;

  const [draggingInfo, setDraggingInfo] = useState(null);
  const draggingInfoRef = useRef(null);
  const updateDraggingInfo = (val) => {
    draggingInfoRef.current = val;
    setDraggingInfo(val);
  };

  const pendingMoveRef = useRef(null);
  const moveFrameRef = useRef(null);
  useEffect(() => () => cancelAnimationFrame(moveFrameRef.current), []);

  const handleBgPointerDown = (e, view) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (placingType) {
      const wrapperRef = (view === 'TOP' ? topViewRef : sideViewRef);
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      let rawX = (e.clientX - rect.left) / zoom;
      let rawSecondary = (e.clientY - rect.top) / zoom;
      if (snapToGrid) ({ x: rawX, secondary: rawSecondary } = snapPoint(rawX, rawSecondary, view));

      if (!TYPES[placingType]) {
        setPlacingType(null);
        return;
      }
      const newItem = createPlacedItem({ placingType, view, rawX, rawSecondary, branch: ghostBranch });
      if (!newItem) return; // e.g. a side anchor clicked in the TOP view

      setItems(prev => [...prev, newItem].sort(byDistance));
      selection.select(newItem.id);
      setLastClickedView(view);
      setPlacingType(null);
      setGhostPos(null);
      setGhostBranch(null);
      return;
    }
    cancelFocusItem();
    if (!isMultiSelectModifier(e)) selection.select(null);
    setEditingLabel(null);
    const otherView = view === 'TOP' ? 'SIDE' : 'TOP';
    updateDraggingInfo({
      type: 'pan',
      view,
      startX: e.clientX,
      startY: e.clientY,
      startPanX: pan[view].x,
      startPanY: pan[view].y,
      startPanXOther: pan[otherView].x
    });
  };

  const handlePointerDown = (e, id, view, wrapperRef) => {
    if (placingType) {
      handleBgPointerDown(e, view);
      return;
    }
    e.stopPropagation();
    if (editingLabel && editingLabel.id !== id) setEditingLabel(null);

    const item = computedItemsRef.current?.find(i => i.id === id) || items.find(i => i.id === id);
    if (!item || !wrapperRef.current) return;
    setLastClickedView(view);

    // Shift / Ctrl / Cmd + click adds or removes the item from the selection without dragging.
    if (isMultiSelectModifier(e)) {
      cancelFocusItem();
      selection.toggle(id);
      return;
    }

    // Pressing an item that is already part of a multi-selection keeps the group for dragging.
    const keepGroup = selection.ids.length > 1 && selection.ids.includes(id);
    if (keepGroup) selection.setPrimary(id);
    else selection.select(id);

    if (item.isLocked) {
      scheduleFocus(id);
      return;
    }

    const rect = wrapperRef.current.getBoundingClientRect();
    const pointerX = (e.clientX - rect.left) / zoom;
    const pointerSecondary = (e.clientY - rect.top) / zoom;
    const bounds = getItemBoundsM(item);
    const group = keepGroup
      ? items
          .filter(i => i.id !== id && selection.ids.includes(i.id) && !i.isLocked)
          .map(i => ({ id: i.id, startDist: getItemBoundsM(i).dist }))
      : [];

    updateDraggingInfo({
      type: 'component',
      id,
      view,
      wrapperRef,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: item.x - pointerX,
      offsetSecondary: (view === 'SIDE' ? item.y : item.z) - pointerSecondary,
      startDist: bounds.dist,
      startChamberStart: bounds.start,
      startChamberEnd: bounds.end,
      group
    });
  };

  const handleResizePointerDown = (e, id, view) => {
    if (placingType) {
      handleBgPointerDown(e, view);
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    const item = items.find(i => i.id === id);
    if (!item || item.isLocked) return;
    const conf = TYPES[item.type];
    selection.select(id);
    setLastClickedView(view);
    updateDraggingInfo({
      type: 'resize',
      id,
      view,
      startX: e.clientX,
      startY: e.clientY,
      startW: item.dimX ?? conf.width,
      startH: view === 'SIDE' ? (item.dimY ?? conf.height) : (item.dimZ ?? conf.height),
      startXPos: item.x,
      startSecondaryPos: view === 'SIDE' ? item.y : item.z
    });
  };

  const handleLabelPointerDown = (e, id, view) => {
    if (placingType) {
      handleBgPointerDown(e, view);
      return;
    }
    e.stopPropagation();
    const item = items.find(i => i.id === id);
    if (!item) return;
    selection.select(id);
    setLastClickedView(view);
    const conf = TYPES[item.type];
    const isGratingActive = item.type === 'GRATING' && ((view === 'SIDE' && (item.orientation || 'Vertical') === 'Vertical') || (view === 'TOP' && item.orientation === 'Horizontal'));
    const isSimpleMirror = (item.type === 'VFM' && view === 'SIDE') || (item.type === 'HFM' && view === 'TOP') || isGratingActive;
    const itemH = getItemVisualHeight(item, view);
    let defaultY = isSimpleMirror ? itemH + 8 : (itemH / 2) + 8;
    if (item.type === 'HUTCH') defaultY = -(itemH / 2) - 12;
    if (item.type === 'WALL') defaultY = (itemH / 2) + 12;
    if (item.type === 'SOURCE') defaultY = (itemH / 2) + 8;
    updateDraggingInfo({
      type: 'label',
      id,
      view,
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: item.labelOffsets?.[view]?.x ?? (item.type === 'SOURCE' ? -((item.dimX ?? conf.width) / 2) : 0),
      startOffsetY: item.labelOffsets?.[view]?.y ?? defaultY
    });
  };

  const applyComponentDrag = (drag, clientX, clientY, wrapperRef) => {
    if (!wrapperRef?.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    let rawX = (clientX - rect.left) / zoom + drag.offsetX;
    let rawSecondary = (clientY - rect.top) / zoom + drag.offsetSecondary;
    if (snapToGrid) ({ x: rawX, secondary: rawSecondary } = snapPoint(rawX, rawSecondary, drag.view));

    const newDistance = parseFloat(((rawX - ORIGIN_X) / PX_PER_M).toFixed(2));
    const delta = newDistance - drag.startDist;
    const groupStart = new Map(drag.group.map(g => [g.id, g.startDist]));
    const view = drag.view;

    setItems(prevItems => prevItems.map(item => {
      if (groupStart.has(item.id)) {
        const target = parseFloat((groupStart.get(item.id) + delta).toFixed(3));
        return calculateUpdatedBounds(item, 'distance', target, boundsConstraint(item));
      }
      if (item.id !== drag.id) return item;

      const isDetector = item.type === 'DETECTOR';
      const isSideActive = isRangeType(item.type) || ['DETECTOR', 'ANCHOR', 'ANCHOR_SIDE'].includes(item.type);
      const isTopActive = isRangeType(item.type) || ['DETECTOR', 'ANCHOR', 'ANCHOR_TOP'].includes(item.type);
      const isRange = isRangeType(item.type);

      let newHeight = item.height ?? 0;
      let newY = item.y;
      let newOffset = item.offset ?? 0;
      let newZ = item.z;
      let newStayInPath = item.stayInPath;
      const dSecondary = Math.abs(clientY - drag.startY) / zoom;

      if (view === 'SIDE' && isSideActive) {
        if (isDetector && item.stayInPath !== false && dSecondary < 8) {
          // Dragging primarily along the beamline: keep the detector locked in the optical path
          newStayInPath = true;
        } else {
          newHeight = parseFloat(((BEAM_AXIS_PX - rawSecondary) / PX_PER_MM_V).toFixed(1));
          newY = BEAM_AXIS_PX - newHeight * PX_PER_MM_V;
          if (isDetector) newStayInPath = false;
        }
      }

      if (view === 'TOP' && isTopActive) {
        if (isDetector && item.stayInPath !== false && dSecondary < 8) {
          newStayInPath = true;
        } else {
          newOffset = parseFloat(((rawSecondary - BEAM_AXIS_PX) / PX_PER_MM_V).toFixed(1));
          newZ = BEAM_AXIS_PX + newOffset * PX_PER_MM_V;
          if (isDetector) newStayInPath = false;
        }
      }

      const updatedItem = {
        ...item,
        x: rawX,
        distance: newDistance,
        height: newHeight,
        offset: newOffset,
        y: newY,
        z: newZ,
        ...(isDetector && newStayInPath !== undefined ? { stayInPath: newStayInPath } : {})
      };

      if (isRange) {
        const halfWMeters = (item.dimX ?? 0) / 2 / PX_PER_M;
        updatedItem.start = parseFloat((newDistance - halfWMeters).toFixed(2));
        updatedItem.end = parseFloat((newDistance + halfWMeters).toFixed(2));
      } else if (item.type === 'SOURCE') {
        updatedItem.end = newDistance;
        updatedItem.start = parseFloat((newDistance - getItemLengthM(item)).toFixed(3));
      } else {
        // Translate the chamber footprint together with the optic
        updatedItem.start = parseFloat((drag.startChamberStart + delta).toFixed(3));
        updatedItem.end = parseFloat((drag.startChamberEnd + delta).toFixed(3));
      }
      return updatedItem;
    }));
  };

  const applyResizeDrag = (drag, clientX, clientY) => {
    let dx = (clientX - drag.startX) / zoom;
    let dy = (clientY - drag.startY) / zoom;
    if (snapToGrid) {
      dx = Math.round((dx / PX_PER_M) / SNAP_STEP_M) * SNAP_STEP_M * PX_PER_M;
      dy = Math.round((dy / PX_PER_M) / SNAP_STEP_M) * SNAP_STEP_M * PX_PER_M;
    }
    const view = drag.view;

    setItems(prevItems => prevItems.map(item => {
      if (item.id !== drag.id) return item;
      const newW = Math.max(GRID_SIZE, drag.startW + dx);
      const newH = Math.max(GRID_SIZE, view === 'SIDE' ? drag.startH - dy : drag.startH + dy);
      const isWall = isWallType(item.type);
      const isRange = isRangeType(item.type);
      const newX = drag.startXPos + (newW - drag.startW) / 2;
      let newSecondary = drag.startSecondaryPos + (newH - drag.startH) / 2;
      if (view === 'SIDE' && isWall) newSecondary = FLOOR_PX - newH / 2;
      const newDistance = parseFloat(((newX - ORIGIN_X) / PX_PER_M).toFixed(1));

      const updatedItem = {
        ...item,
        dimX: newW,
        ...(view === 'SIDE' ? { dimY: newH } : { dimZ: newH }),
        x: newX,
        distance: newDistance,
        ...(view === 'SIDE' && isWall ? { y: newSecondary } : {}),
        ...(view === 'TOP' && isWall ? { z: newSecondary } : {})
      };
      if (isRange) {
        const halfWMeters = newW / 2 / PX_PER_M;
        updatedItem.start = parseFloat((newDistance - halfWMeters).toFixed(2));
        updatedItem.end = parseFloat((newDistance + halfWMeters).toFixed(2));
        updatedItem.height = parseFloat((newH / PX_PER_M).toFixed(2));
        updatedItem.dimY = newH;
        updatedItem.dimZ = newH;
      }
      return updatedItem;
    }));
  };

  const applyLabelDrag = (drag, clientX, clientY) => {
    const dx = (clientX - drag.startX) / zoom;
    const dy = (clientY - drag.startY) / zoom;
    setItems(prev => prev.map(item => item.id !== drag.id ? item : {
      ...item,
      labelOffsets: {
        ...(item.labelOffsets || {}),
        [drag.view]: { x: drag.startOffsetX + dx, y: drag.startOffsetY + dy }
      }
    }));
  };

  /** Applies the most recent pointer position to the active drag. */
  const flushPendingMove = () => {
    cancelAnimationFrame(moveFrameRef.current);
    moveFrameRef.current = null;
    const pending = pendingMoveRef.current;
    pendingMoveRef.current = null;
    const drag = draggingInfoRef.current;
    if (!pending || !drag) return;
    const { clientX, clientY, wrapperRef } = pending;

    if (drag.type === 'pan') {
      const dx = clientX - drag.startX;
      const dy = clientY - drag.startY;
      const otherView = drag.view === 'TOP' ? 'SIDE' : 'TOP';
      setPan(prev => ({
        ...prev,
        [drag.view]: { x: drag.startPanX + dx, y: drag.startPanY + dy },
        [otherView]: { x: drag.startPanXOther + dx, y: prev[otherView].y }
      }));
      return;
    }
    // Do not move anything until the press has clearly become a drag, so a plain click never nudges an item.
    if (!drag.hasMoved) return;
    if (drag.type === 'component') applyComponentDrag(drag, clientX, clientY, wrapperRef || drag.wrapperRef);
    else if (drag.type === 'resize') applyResizeDrag(drag, clientX, clientY);
    else if (drag.type === 'label') applyLabelDrag(drag, clientX, clientY);
  };

  const handlePointerMove = (e, view, wrapperRef) => {
    if (placingType) {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      let rawX = (e.clientX - rect.left) / zoom;
      let rawSecondary = (e.clientY - rect.top) / zoom;
      if (snapToGrid) ({ x: rawX, secondary: rawSecondary } = snapPoint(rawX, rawSecondary, view));
      setGhostPos({ view, x: rawX, y: rawSecondary });
      return;
    }
    const drag = draggingInfoRef.current;
    if (!drag || drag.view !== view) return;

    if (!drag.hasMoved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > DRAG_THRESHOLD_PX) {
      drag.hasMoved = true;
      if (drag.type === 'pan') markViewMoved();
      cancelFocusItem();
    }
    pendingMoveRef.current = { clientX: e.clientX, clientY: e.clientY, wrapperRef };
    if (moveFrameRef.current == null) {
      moveFrameRef.current = requestAnimationFrame(flushPendingMove);
    }
  };

  const handlePointerUp = () => {
    flushPendingMove();
    const drag = draggingInfoRef.current;
    if ((drag?.type === 'component' || drag?.type === 'label') && !drag.hasMoved) {
      scheduleFocus(drag.id);
    }
    if (drag?.type === 'component' && drag.hasMoved) {
      setItems(prev => [...prev].sort(byDistance));
    }
    updateDraggingInfo(null);
  };

  const handleLabelDoubleClick = (e, id, defaultText, view = null) => {
    e?.stopPropagation?.();
    cancelFocusItem();
    selection.select(id);
    updateDraggingInfo(null);
    setEditingLabel({ id, text: defaultText, view });
  };

  return {
    draggingInfo, setDraggingInfo: updateDraggingInfo,
    handleBgPointerDown, handlePointerDown, handleResizePointerDown, handleLabelPointerDown,
    handlePointerMove, handlePointerUp, handleLabelDoubleClick
  };
};
