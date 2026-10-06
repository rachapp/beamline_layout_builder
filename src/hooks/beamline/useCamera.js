import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { TYPES, ORIGIN_X, PX_PER_M, BEAM_AXIS_PX, FLOOR_PX, FOCUS_DELAY_MS, isRangeType, isDcmType } from '../../constants';
import { getItemVisualHeight, numOr } from '../../utils';
import { getItemBoundsM } from '../../utils/constructionUtils';

/**
 * Zoom and pan for the TOP and SIDE viewports: fit-to-screen, zoom-to-item, mouse-wheel zoom,
 * and re-fitting when the viewport is resized.
 */
export const useCamera = ({ itemsRef, computedItemsRef, editingLabelRef, placingType, refitKey }) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({
    TOP: { x: 50, y: 100 },
    SIDE: { x: 50, y: 100 }
  });
  const [activeView, setActiveView] = useState('BOTH');
  const activeViewRef = useRef(activeView);
  activeViewRef.current = activeView;

  const sideViewRef = useRef(null);
  const topViewRef = useRef(null);
  const sideScrollRef = useRef(null);
  const topScrollRef = useRef(null);

  // True while the view still shows a fit-to-screen framing. Any manual zoom, pan or focus clears
  // it, so resizing the window re-fits only when the user has not moved the view themselves.
  const isFittedRef = useRef(false);
  const markViewMoved = () => { isFittedRef.current = false; };

  const getContainers = () => {
    const topContainer = topScrollRef.current;
    const sideContainer = sideScrollRef.current;
    const primaryContainer = (activeViewRef.current === 'SIDE' ? sideContainer : topContainer)
      || topContainer
      || sideContainer;
    return { topContainer, sideContainer, primaryContainer };
  };

  const handleFitToScreen = (customItems = null) => {
    // When used directly as onClick={handleFitToScreen}, customItems is a click event, not an array.
    const targetItems = Array.isArray(customItems) ? customItems : (itemsRef.current || []);
    const { topContainer, sideContainer, primaryContainer } = getContainers();
    if (!primaryContainer) return false;

    const containerW = primaryContainer.clientWidth;
    if (containerW <= 0) return false;

    let minX = Infinity, maxX = -Infinity;
    targetItems.forEach(i => {
      const bounds = getItemBoundsM(i);
      const conf = TYPES[i.type] || { width: 20 };
      const isRange = isRangeType(i.type);
      const isSource = i.type === 'SOURCE';
      const isDCM = isDcmType(i.type);

      // Physical footprint boundaries (in canvas px)
      const physStartPx = ORIGIN_X + bounds.start * PX_PER_M;
      const physEndPx = ORIGIN_X + bounds.end * PX_PER_M;

      // Visual graphic boundaries (in canvas px)
      const itemW = (isRange || isDCM || isSource) ? (i.dimX ?? conf.width) : conf.width;
      let visStartPx, visEndPx;
      if (isSource) {
        visStartPx = (i.x ?? ORIGIN_X) - itemW;
        visEndPx = (i.x ?? ORIGIN_X);
      } else if (isRange) {
        visStartPx = Math.min(physStartPx, physEndPx);
        visEndPx = Math.max(physStartPx, physEndPx);
      } else {
        const cx = i.x ?? (ORIGIN_X + bounds.dist * PX_PER_M);
        visStartPx = cx - itemW / 2;
        visEndPx = cx + itemW / 2;
      }

      minX = Math.min(minX, physStartPx, physEndPx, visStartPx, visEndPx);
      maxX = Math.max(maxX, physStartPx, physEndPx, visStartPx, visEndPx);
    });

    if (minX === Infinity || minX >= maxX) {
      minX = ORIGIN_X;
      maxX = ORIGIN_X + 600;
    }
    // Ensure beamline reference origin (0.000m) is included in the frame
    minX = Math.min(minX, ORIGIN_X);

    const paddingX = 80;
    const contentW = (maxX - minX) + paddingX * 2;
    const zoomX = containerW / contentW;

    // Framing vertically around the optical axis
    const contentH = 240;
    const availableH = Math.min(
      (topContainer && topContainer.clientHeight > 0) ? topContainer.clientHeight : Infinity,
      (sideContainer && sideContainer.clientHeight > 0) ? sideContainer.clientHeight : Infinity,
      primaryContainer.clientHeight > 0 ? primaryContainer.clientHeight : Infinity
    );
    if (!Number.isFinite(availableH) || availableH <= 40) return false;
    const zoomY = Math.max(0.1, (availableH - 40) / contentH);

    let newZoom = Math.min(zoomX, zoomY);
    newZoom = Math.max(0.1, Math.min(newZoom, 2.5));
    newZoom = parseFloat(newZoom.toFixed(3));

    setZoom(newZoom);

    const targetPanX = Math.round(containerW / 2 - ((minX + maxX) / 2) * newZoom);

    // Compute Y pan per container height so both TOP and SIDE viewports center the beam axis
    const topH = topContainer?.clientHeight || primaryContainer.clientHeight;
    const sideH = sideContainer?.clientHeight || primaryContainer.clientHeight;
    setPan({
      TOP: { x: targetPanX, y: Math.round(topH / 2 - BEAM_AXIS_PX * newZoom) },
      SIDE: { x: targetPanX, y: Math.round(sideH / 2 - BEAM_AXIS_PX * newZoom) }
    });

    isFittedRef.current = true;
    return true;
  };

  const focusItemTimerRef = useRef(null);

  const cancelFocusItem = () => {
    if (focusItemTimerRef.current) {
      clearTimeout(focusItemTimerRef.current);
      focusItemTimerRef.current = null;
    }
  };

  useEffect(() => () => cancelFocusItem(), []);

  const focusItem = (targetItemOrId) => {
    if (editingLabelRef.current) return false;
    requestAnimationFrame(() => {
      const { topContainer, sideContainer, primaryContainer } = getContainers();
      if (!primaryContainer) return;
      const containerW = primaryContainer.clientWidth;
      if (containerW <= 0) return;

      const item = typeof targetItemOrId === 'object' && targetItemOrId !== null
        ? targetItemOrId
        : (computedItemsRef.current?.find(i => i.id === targetItemOrId)
           || itemsRef.current?.find(i => i.id === targetItemOrId));
      if (!item) return;

      const conf = TYPES[item.type] || {};
      const isRange = isRangeType(item.type);
      const isSource = item.type === 'SOURCE';
      const isDCM = isDcmType(item.type);

      const bounds = getItemBoundsM(item);
      const physLenM = bounds?.physLen ?? (item.physicalLength || conf.defaultLength || (conf.width ? conf.width / PX_PER_M : 1));
      const compW = isDCM
        ? (bounds?.len ? bounds.len * PX_PER_M : 30)
        : ((isRange || isSource)
          ? (item.dimX ?? conf.width ?? 40)
          : Math.max(6, physLenM * PX_PER_M));
      const compH_side = getItemVisualHeight(item, 'SIDE');
      const compH_top = getItemVisualHeight(item, 'TOP');

      // 1. Component target center X in canvas space
      let targetCenterX = item.x ?? (ORIGIN_X + (item.distance || 0) * PX_PER_M);
      if (isSource) {
        targetCenterX = targetCenterX - compW / 2;
      } else if (isDCM) {
        targetCenterX = ORIGIN_X + ((bounds.start + bounds.end) / 2) * PX_PER_M;
      } else if (isRange && item.start !== undefined && item.end !== undefined) {
        targetCenterX = ORIGIN_X + ((parseFloat(item.start) + parseFloat(item.end)) / 2) * PX_PER_M;
      }

      // 2. Component target center in TOP view (lateral coordinate Z)
      let targetCenterZ_top;
      if (item.type === 'HFM' || (item.type === 'GRATING' && item.orientation === 'Horizontal')) {
        targetCenterZ_top = (item.z ?? BEAM_AXIS_PX) + compH_top / 2;
      } else if (item.type === 'HDCM') {
        targetCenterZ_top = item.z ?? BEAM_AXIS_PX;
      } else {
        targetCenterZ_top = item.z ?? (BEAM_AXIS_PX + numOr(item.hOffsetLateral, 0) * PX_PER_M);
      }

      // 3. Component target center in SIDE view (elevation coordinate Y)
      let targetCenterY_side;
      if (item.type === 'WALL' || item.type === 'HUTCH') {
        targetCenterY_side = FLOOR_PX - compH_side / 2;
      } else if (item.type === 'VFM' || (item.type === 'GRATING' && (item.orientation || 'Vertical') === 'Vertical')) {
        targetCenterY_side = (item.y ?? BEAM_AXIS_PX) + compH_side / 2;
      } else if (item.type === 'VDCM') {
        targetCenterY_side = item.y ?? BEAM_AXIS_PX;
      } else {
        targetCenterY_side = item.y ?? (FLOOR_PX - numOr(item.vOffsetFloor, 2.5) * PX_PER_M);
      }

      const fallbackH = primaryContainer.clientHeight > 0 ? primaryContainer.clientHeight : 400;
      const topH = topContainer?.clientHeight > 0 ? topContainer.clientHeight : fallbackH;
      const sideH = sideContainer?.clientHeight > 0 ? sideContainer.clientHeight : fallbackH;
      const view = activeViewRef.current;
      const viewH = view === 'TOP' ? topH : (view === 'SIDE' ? sideH : Math.min(topH, sideH));

      // 4. Zoom so the component (body + label) fills ~70% of the viewport
      const labelText = item.customName || conf.name || '';
      const labelW = Math.max(30, labelText.length * 8.5);
      const compVisualW = Math.max(compW, labelW, 40);
      const compVisualH = Math.max(compH_side, compH_top, 30);
      const targetOccupancy = 0.70;
      const componentFitZoom = Math.min(
        (containerW * targetOccupancy) / compVisualW,
        (viewH * targetOccupancy) / compVisualH
      );
      // Up to 3.5x for small optics, scaling down naturally for large enclosures
      const targetZoom = parseFloat(Math.min(3.5, Math.max(0.4, componentFitZoom)).toFixed(2));

      // 5. Pan to center the component
      const targetPanX = Math.round(containerW / 2 - targetCenterX * targetZoom);
      const nextPan = {
        TOP: { x: targetPanX, y: Math.round(topH / 2 - targetCenterZ_top * targetZoom) },
        SIDE: { x: targetPanX, y: Math.round(sideH / 2 - targetCenterY_side * targetZoom) }
      };
      // Never apply a NaN transform: it would make the canvas disappear.
      if (![targetZoom, nextPan.TOP.y, nextPan.SIDE.y, targetPanX].every(Number.isFinite)) return;

      setZoom(targetZoom);
      setPan(nextPan);
      isFittedRef.current = false;
    });
    return true;
  };

  /** Zooms to an item after a short delay, so that starting a drag can cancel it. */
  const scheduleFocus = (id) => {
    cancelFocusItem();
    focusItemTimerRef.current = setTimeout(() => {
      focusItem(id);
      focusItemTimerRef.current = null;
    }, FOCUS_DELAY_MS);
  };

  // Auto fit-to-screen on first load: try before paint, then retry until the layout has a size.
  const hasAutoFittedRef = useRef(false);
  useLayoutEffect(() => {
    if (!hasAutoFittedRef.current && handleFitToScreen()) hasAutoFittedRef.current = true;
  }, []);

  useEffect(() => {
    if (hasAutoFittedRef.current) return;
    let cancelled = false;
    let attempts = 0;
    let rafId = null;
    const tryAutoFit = () => {
      if (cancelled || hasAutoFittedRef.current) return;
      if (handleFitToScreen()) {
        hasAutoFittedRef.current = true;
      } else if (attempts < 15) {
        attempts++;
        rafId = requestAnimationFrame(tryAutoFit);
      }
    };
    rafId = requestAnimationFrame(tryAutoFit);
    const timerId = setTimeout(tryAutoFit, 100);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
    };
  }, []);

  // Fit to screen whenever the user switches view (TOP, BOTH, SIDE)
  const isViewMountRef = useRef(true);
  useEffect(() => {
    if (isViewMountRef.current) {
      isViewMountRef.current = false;
      return;
    }
    let raf2 = null;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => handleFitToScreen());
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [activeView]);

  // Re-fit when the window is resized or the layout around the canvas changes (table or sidebar
  // toggled), as long as the user has not zoomed or panned away from the fitted view.
  // Opening the Properties panel deliberately does not re-fit, so selecting an item never moves the view.
  const handleFitRef = useRef(handleFitToScreen);
  handleFitRef.current = handleFitToScreen;
  useEffect(() => {
    let rafId = null;
    const refitIfFitted = () => {
      if (!isFittedRef.current) return;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => handleFitRef.current());
    };
    window.addEventListener('resize', refitIfFitted);
    return () => {
      window.removeEventListener('resize', refitIfFitted);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const isRefitMountRef = useRef(true);
  useEffect(() => {
    if (isRefitMountRef.current) {
      isRefitMountRef.current = false;
      return;
    }
    if (!isFittedRef.current) return;
    // Wait for the panel's own layout (and the sidebar's 300 ms width transition) to settle.
    const timer = setTimeout(() => handleFitRef.current(), 320);
    return () => clearTimeout(timer);
  }, [refitKey]);

  const handleSetActiveView = (newView) => {
    if (activeView === newView) {
      handleFitToScreen();
    } else {
      setActiveView(newView);
    }
  };

  const handleWheel = (e, view, scrollRef) => {
    cancelFocusItem();
    if (placingType || !scrollRef.current) return;
    const rect = scrollRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zoomFactor = 1 - e.deltaY * 0.0015;
    const newZoom = Math.max(0.1, Math.min(zoom * zoomFactor, 6.0));
    const newPanX = mouseX - (mouseX - pan[view].x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan[view].y) * (newZoom / zoom);
    const otherView = view === 'TOP' ? 'SIDE' : 'TOP';
    markViewMoved();
    setZoom(newZoom);
    setPan(prev => ({
      ...prev,
      [view]: { x: newPanX, y: newPanY },
      [otherView]: { x: newPanX, y: prev[otherView].y }
    }));
  };

  return {
    zoom, setZoom, pan, setPan,
    activeView, setActiveView: handleSetActiveView,
    sideViewRef, topViewRef, sideScrollRef, topScrollRef,
    handleFitToScreen, focusItem, scheduleFocus, cancelFocusItem, handleWheel, markViewMoved
  };
};
