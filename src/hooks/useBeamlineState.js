import { useState, useRef, useEffect, useMemo } from 'react';
import { ORIGIN_X, PX_PER_M } from '../constants';
import { loadAutosave, saveAutosave } from '../utils/autosave';
import { normalizeLegacyItems } from '../utils/itemFactory';
import { useHistory } from './beamline/useHistory';
import { useCamera } from './beamline/useCamera';
import { usePointerHandlers } from './beamline/usePointerHandlers';
import { useItemEditing } from './beamline/useItemEditing';
import { useTemplates } from './beamline/useTemplates';
import { useKeyboardShortcuts } from './beamline/useKeyboardShortcuts';

const PREFERRED_STARTUP_TEMPLATE = 'SPS-II_SWAXS';
const AUTOSAVE_DELAY_MS = 500;
const DEFAULT_CANVAS_SETTINGS = {
  showLabels: true,
  showFootprintBoxes: true,
  showFootprintText: true,
  textSize: 10,
  annotationTextSize: 9,
  rulerTextSize: 10,
  labelBold: false,
};

const loadCanvasSettings = () => {
  try {
    const saved = localStorage.getItem('beamline_canvas_settings');
    if (saved) return { ...DEFAULT_CANVAS_SETTINGS, ...JSON.parse(saved) };
  } catch (e) {}
  return DEFAULT_CANVAS_SETTINGS;
};

/**
 * All editor state for the beamline layout. The work is split across the hooks in ./beamline/;
 * this hook owns the shared state and wires them together.
 */
export const useBeamlineState = () => {
  // The last session's layout, if one was autosaved. Read once on startup.
  const [restored] = useState(() => loadAutosave());

  // ---- Layout items, undo/redo -------------------------------------------------------------
  // Start from the autosaved layout, or empty until the startup template has loaded, so no
  // placeholder layout flashes on screen first.
  const [items, setItems] = useState(() => (restored ? normalizeLegacyItems(restored.items) : []));
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const computedItemsRef = useRef([]);
  const setComputedItems = (newItems) => { computedItemsRef.current = newItems || []; };

  // ---- Selection: `ids` is everything selected, `primary` is the item shown in Properties ----
  const [selectionState, setSelectionState] = useState({ ids: [], primary: null });
  const selection = {
    ids: selectionState.ids,
    primary: selectionState.primary,
    select: (id) => setSelectionState(id == null ? { ids: [], primary: null } : { ids: [id], primary: id }),
    selectMany: (ids) => setSelectionState({ ids, primary: ids[ids.length - 1] ?? null }),
    setPrimary: (id) => setSelectionState(prev => ({ ...prev, primary: id })),
    toggle: (id) => setSelectionState(prev => {
      if (prev.ids.includes(id)) {
        const ids = prev.ids.filter(x => x !== id);
        return { ids, primary: prev.primary === id ? (ids[ids.length - 1] ?? null) : prev.primary };
      }
      return { ids: [...prev.ids, id], primary: id };
    })
  };
  const selectedId = selectionState.primary;
  const selectedIds = selectionState.ids;

  // Drop deleted items from the selection (after delete, undo, or loading a template).
  useEffect(() => {
    const present = new Set(items.map(i => i.id));
    if (selectionState.ids.some(id => !present.has(id))) {
      const ids = selectionState.ids.filter(id => present.has(id));
      setSelectionState({ ids, primary: present.has(selectionState.primary) ? selectionState.primary : (ids[ids.length - 1] ?? null) });
    }
  }, [items]);

  // ---- Simple UI state ----------------------------------------------------------------------
  const [editingLabel, setEditingLabel] = useState(null);
  const editingLabelRef = useRef(null);
  editingLabelRef.current = editingLabel;

  const [placingType, setPlacingType] = useState(null);
  const [ghostPos, setGhostPos] = useState(null);
  // Which branch the ghost is currently snapped to ('straight' | 'diffracted' | null)
  const [ghostBranch, setGhostBranch] = useState(null);
  const cancelPlacing = () => {
    setPlacingType(null);
    setGhostPos(null);
    setGhostBranch(null);
  };

  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showRuler, setShowRuler] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [canvasLength, setCanvasLength] = useState(() => restored?.canvasLength ?? 60);
  const [showUI, setShowUI] = useState(true);
  const [lastClickedView, setLastClickedView] = useState('SIDE');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isTableOpen, setIsTableOpen] = useState(false);
  const [tableViewMode, setTableViewMode] = useState('split');
  const [isCadExportOpen, setIsCadExportOpen] = useState(false);
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);

  const [canvasSettings, setCanvasSettings] = useState(loadCanvasSettings);
  useEffect(() => {
    try {
      localStorage.setItem('beamline_canvas_settings', JSON.stringify(canvasSettings));
    } catch (e) {}
  }, [canvasSettings]);

  // ---- Camera: zoom, pan, fit, focus -------------------------------------------------------
  const camera = useCamera({
    itemsRef, computedItemsRef, editingLabelRef, placingType,
    refitKey: `${isTableOpen}-${tableViewMode}-${showUI}`
  });

  // ---- Pointer interaction -----------------------------------------------------------------
  const pointer = usePointerHandlers({
    items, setItems, computedItemsRef,
    camera, snapToGrid,
    placingType, setPlacingType, setGhostPos, ghostBranch, setGhostBranch,
    selection, setLastClickedView,
    editingLabel, setEditingLabel
  });

  const history = useHistory(items, setItems, pointer.draggingInfo !== null);

  // ---- Templates & CSV import --------------------------------------------------------------
  const applyLayout = (newItems, { canvasLength: newLength = null, fileName = null } = {}) => {
    if (newLength) setCanvasLength(newLength);
    if (fileName !== null) templatesApi.setLoadedFileName(fileName);
    setItems(newItems);
    selection.select(null);
    // Fit in the same render that shows the new items, so the layout never appears at the previous
    // zoom first. If the viewports have no size yet, try again once they have been laid out.
    if (!camera.handleFitToScreen(newItems, { instant: true })) {
      setTimeout(() => camera.handleFitToScreen(newItems, { instant: true }), 60);
    }
  };
  const templatesApi = useTemplates({ applyLayout });

  // Startup: restore the autosaved layout, or load the preferred template. If no template can be
  // fetched (offline, or the templates folder is missing), fall back to the bundled layout.
  // The ref keeps this to once per page load: React re-runs effects on hot reload (and twice in
  // StrictMode), and a second run would replace the user's layout with the template.
  const startupRanRef = useRef(false);
  useEffect(() => {
    if (startupRanRef.current) return;
    startupRanRef.current = true;
    if (restored?.loadedFileName) templatesApi.setLoadedFileName(restored.loadedFileName);
    (async () => {
      const list = await templatesApi.refreshTemplates();
      if (restored) return;
      const target = list.find(t => t.name === PREFERRED_STARTUP_TEMPLATE) || list[0];
      const loaded = target ? await templatesApi.loadTemplate(target.fileName || `${target.name}.csv`, list) : false;
      if (!loaded) await templatesApi.loadBundledFallback();
    })();
  }, []);

  // The startup layout is the starting point, not an edit: make sure it cannot be undone into a blank canvas.
  const startupSettledRef = useRef(Boolean(restored));
  useEffect(() => {
    if (!startupSettledRef.current && items.length > 0) {
      startupSettledRef.current = true;
      history.resetWith(items);
    }
  }, [items]);

  // ---- Autosave ----------------------------------------------------------------------------
  useEffect(() => {
    if (!startupSettledRef.current) return;
    const timer = setTimeout(() => {
      saveAutosave({ items, canvasLength, loadedFileName: templatesApi.loadedFileName });
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [items, canvasLength, templatesApi.loadedFileName]);

  // ---- Editing ------------------------------------------------------------------------------
  const editing = useItemEditing({ setItems, selectedId, selection, computedItemsRef });

  const handleClearAll = () => {
    if (window.confirm('Clear the entire layout? You can undo this with Ctrl+Z.')) {
      setItems([]);
      selection.select(null);
      setPlacingType(null);
      templatesApi.setLoadedFileName('');
    }
  };

  const addItem = (typeId) => {
    setPlacingType(typeId);
    selection.select(null);
  };

  useKeyboardShortcuts({
    items, setItems, selection, editingLabel, setEditingLabel, placingType, cancelPlacing,
    activeView: camera.activeView, lastClickedView, computedItemsRef,
    deleteSelected: editing.deleteSelected, undo: history.undo, redo: history.redo,
    handleFitToScreen: camera.handleFitToScreen, isShortcutHelpOpen, setIsShortcutHelpOpen
  });

  const selectedItem = items.find(i => i.id === selectedId);
  const sourceItem = useMemo(() => items.find(i => i.type === 'SOURCE') || {}, [items]);
  const canvasWidth = ORIGIN_X + (canvasLength + 10) * PX_PER_M;

  return {
    items, setItems,
    selectedId, setSelectedId: selection.select, selectedIds, toggleSelected: selection.toggle,
    selectAll: () => selection.selectMany(items.map(i => i.id)),
    draggingInfo: pointer.draggingInfo, setDraggingInfo: pointer.setDraggingInfo,
    editingLabel, setEditingLabel, placingType, setPlacingType, ghostPos, setGhostPos, ghostBranch, setGhostBranch,
    zoom: camera.zoom, setZoom: camera.setZoom, pan: camera.pan, setPan: camera.setPan, cameraJumpId: camera.cameraJumpId,
    showGrid, setShowGrid, snapToGrid, setSnapToGrid, showRuler, setShowRuler,
    showAnnotations, setShowAnnotations,
    canvasLength, setCanvasLength, showUI, setShowUI,
    activeView: camera.activeView, setActiveView: camera.setActiveView,
    lastClickedView, setLastClickedView,
    isSettingsModalOpen, setIsSettingsModalOpen, canvasSettings, setCanvasSettings,
    isTableOpen, setIsTableOpen, tableViewMode, setTableViewMode, isCadExportOpen, setIsCadExportOpen,
    isShortcutHelpOpen, setIsShortcutHelpOpen,
    sideViewRef: camera.sideViewRef, topViewRef: camera.topViewRef,
    sideScrollRef: camera.sideScrollRef, topScrollRef: camera.topScrollRef,
    selectedItem, sourceItem, canvasWidth,
    handleWheel: camera.handleWheel, handleFitToScreen: camera.handleFitToScreen,
    focusItem: camera.focusItem, cancelFocusItem: camera.cancelFocusItem,
    loadTemplate: templatesApi.loadTemplate, handleImportCsv: templatesApi.handleImportCsv,
    templateList: templatesApi.templateList, refreshTemplates: templatesApi.refreshTemplates,
    loadedFileName: templatesApi.loadedFileName, setLoadedFileName: templatesApi.setLoadedFileName,
    handleClearAll, addItem,
    handleBgPointerDown: pointer.handleBgPointerDown, handlePointerDown: pointer.handlePointerDown,
    handleResizePointerDown: pointer.handleResizePointerDown, handleLabelPointerDown: pointer.handleLabelPointerDown,
    handlePointerMove: pointer.handlePointerMove, handlePointerUp: pointer.handlePointerUp,
    handleLabelDoubleClick: pointer.handleLabelDoubleClick,
    deleteSelected: editing.deleteSelected, updateItemProp: editing.updateItemProp,
    undo: history.undo, redo: history.redo, canUndo: history.canUndo, canRedo: history.canRedo,
    setComputedItems
  };
};
