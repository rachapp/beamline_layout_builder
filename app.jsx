import { useEffect } from 'react';
import { Moon, Sun, PanelLeftClose, PanelLeftOpen, Sliders, Table, Sparkles, FileDown, FileUp, ChevronRight, Undo2, Redo2, Keyboard } from 'lucide-react';

import { useTheme } from './src/hooks/useTheme';
import { usePhysicsEngine } from './src/hooks/usePhysicsEngine';
import { useBeamlineState } from './src/hooks/useBeamlineState';

import { Sidebar } from './src/components/Sidebar';
import { Viewport } from './src/components/Viewport';
import { PropertiesWidget } from './src/components/PropertiesWidget';
import { SettingsModal } from './src/components/SettingsModal';
import { TableView } from './src/components/TableView';
import { CadSvgExportModal } from './src/components/CadSvgExportModal';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ShortcutHelp } from './src/components/ShortcutHelp';
import { downloadCsv } from './src/utils/constructionUtils';

function BeamlineLayoutApp() {
  const { isDarkMode, setIsDarkMode, theme } = useTheme();

  const state = useBeamlineState();
  const { computedItems, tracePointsSide, tracePointsTop, tracePointsSideBranch, tracePointsTopBranch } = usePhysicsEngine(state.items);

  useEffect(() => {
    state.setComputedItems?.(computedItems);
  }, [computedItems]);

  const rayColor = state.sourceItem?.rayColor || theme.beam;
  const rayWidth = state.sourceItem?.rayWidth ?? 1.5;
  const rayStyle = state.sourceItem?.rayStyle || 'dashed';
  const showArrow = state.sourceItem?.showArrow !== false;

  const scheduleItems = computedItems && computedItems.length > 0 ? computedItems : state.items;
  const exportCsv = () => downloadCsv(scheduleItems, 'beamline_construction_schedule.csv', state.canvasLength);
  const importCsvFile = (file) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) state.handleImportCsv(evt.target.result, file.name);
    };
    reader.readAsText(file);
  };

  // Text labels on toolbar buttons; icon-only while the Properties panel takes up the right side.
  const toolbarLabel = state.selectedItem ? 'hidden 2xl:inline' : 'hidden md:inline';
  const toolbarButton = `p-2 border shadow-sm rounded-none transition-colors ${theme.buttonBg} ${theme.text}`;
  const toolbarTextButton = `px-2.5 py-1.5 border shadow-sm rounded-none transition-colors flex items-center gap-1.5 text-xs font-bold ${theme.buttonBg} ${theme.text}`;

  // Props shared by the TOP and SIDE viewports
  const viewportProps = {
    theme,
    draggingInfo: state.draggingInfo,
    placingType: state.placingType,
    pan: state.pan,
    zoom: state.zoom,
    cameraJumpId: state.cameraJumpId,
    showGrid: state.showGrid,
    showRuler: state.showRuler,
    showAnnotations: state.showAnnotations,
    canvasWidth: state.canvasWidth,
    isDarkMode,
    computedItems,
    selectedIds: state.selectedIds,
    setSelectedId: state.setSelectedId,
    editingLabel: state.editingLabel,
    rayColor,
    rayWidth,
    rayStyle,
    showArrow,
    sourceItem: state.sourceItem,
    handleBgPointerDown: state.handleBgPointerDown,
    handlePointerMove: state.handlePointerMove,
    handlePointerUp: state.handlePointerUp,
    handleWheel: state.handleWheel,
    handlePointerDown: state.handlePointerDown,
    handleResizePointerDown: state.handleResizePointerDown,
    handleLabelPointerDown: state.handleLabelPointerDown,
    handleLabelDoubleClick: state.handleLabelDoubleClick,
    cancelFocusItem: state.cancelFocusItem,
    setEditingLabel: state.setEditingLabel,
    setItems: state.setItems,
    ghostPos: state.ghostPos,
    ghostBranch: state.ghostBranch,
    setGhostBranch: state.setGhostBranch,
    canvasSettings: state.canvasSettings
  };

  return (
    <div className={`flex h-screen w-full font-sans overflow-hidden select-none ${isDarkMode ? 'dark ' : ''}${theme.bg}`}>

      {/* FLOATING GLOBAL TOOLBAR (moves left of the Properties panel while it is open) */}
      <div className={`absolute top-4 z-50 flex items-center gap-2 ${state.selectedItem ? 'right-[21rem]' : 'right-4'}`}>
         <button
           onClick={state.undo}
           disabled={!state.canUndo}
           title="Undo (Ctrl+Z)"
           className={`${toolbarButton} disabled:opacity-40 disabled:cursor-not-allowed`}
         >
            <Undo2 size={18} />
         </button>
         <button
           onClick={state.redo}
           disabled={!state.canRedo}
           title="Redo (Ctrl+Y)"
           className={`${toolbarButton} disabled:opacity-40 disabled:cursor-not-allowed`}
         >
            <Redo2 size={18} />
         </button>

         {/* Construction Table Schedule Toggle */}
         <button
           onClick={() => state.setIsTableOpen(!state.isTableOpen)}
           title={state.isTableOpen ? "Hide Construction Table Schedule" : "Open Construction Schedule & Clearance Table"}
           className={`px-2.5 py-1.5 border shadow-sm rounded-none transition-colors flex items-center gap-1.5 text-xs font-bold ${
             state.isTableOpen ? 'bg-blue-600 text-white border-blue-700' : `${theme.buttonBg} ${theme.text} hover:border-blue-500`
           }`}
         >
            <Table size={16} className={state.isTableOpen ? 'text-white' : 'text-blue-500'} />
            <span className={toolbarLabel}>Table Guide</span>
         </button>

         {/* CAD Vector Export Button */}
         <button
           onClick={() => state.setIsCadExportOpen(true)}
           title="Export CAD Vector Blueprint (SVG)"
           className={`${toolbarTextButton} hover:border-blue-500`}
         >
            <Sparkles size={16} className="text-blue-500" />
            <span className={toolbarLabel}>CAD SVG</span>
         </button>

         {/* Export Table to CSV Button */}
         <button
           onClick={exportCsv}
           title="Export Construction Schedule Table to CSV (Excel compatible)"
           className={`${toolbarTextButton} hover:border-emerald-500 hover:text-emerald-500`}
         >
            <FileDown size={16} className="text-emerald-500" />
            <span className={toolbarLabel}>Export CSV</span>
         </button>

         {/* Import CSV Button */}
         <label
           title="Import Beamline from CSV File"
           className={`${toolbarTextButton} cursor-pointer hover:border-emerald-500 hover:text-emerald-500`}
         >
            <FileUp size={16} className="text-emerald-500" />
            <span className={toolbarLabel}>Import CSV</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importCsvFile(file);
                e.target.value = '';
              }}
            />
         </label>

         <button onClick={() => state.setIsShortcutHelpOpen(true)} title="Keyboard shortcuts (?)" className={toolbarButton}>
            <Keyboard size={18} />
         </button>
         <button
           onClick={() => state.setIsSettingsModalOpen(true)}
           title="Global Canvas Settings (Text Size, etc.)"
           className={toolbarButton}
         >
            <Sliders size={18} />
         </button>
         <button onClick={() => setIsDarkMode(!isDarkMode)} title={isDarkMode ? 'Light mode' : 'Dark mode'} className={toolbarButton}>
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
         </button>
         <button onClick={() => state.setShowUI(!state.showUI)} title={state.showUI ? 'Hide sidebar' : 'Show sidebar'} className={toolbarButton}>
            {state.showUI ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
         </button>
      </div>

      {/* SIDEBAR PALETTE */}
      <ErrorBoundary name="The sidebar" className={state.showUI ? 'w-72' : 'hidden'}>
        <Sidebar
          showUI={state.showUI}
          setShowUI={state.setShowUI}
          theme={theme}
          loadTemplate={state.loadTemplate}
          handleFitToScreen={state.handleFitToScreen}
          handleClearAll={state.handleClearAll}
          showGrid={state.showGrid}
          setShowGrid={state.setShowGrid}
          snapToGrid={state.snapToGrid}
          setSnapToGrid={state.setSnapToGrid}
          showRuler={state.showRuler}
          setShowRuler={state.setShowRuler}
          showAnnotations={state.showAnnotations}
          setShowAnnotations={state.setShowAnnotations}
          canvasLength={state.canvasLength}
          setCanvasLength={state.setCanvasLength}
          activeView={state.activeView}
          setActiveView={state.setActiveView}
          addItem={state.addItem}
          placingType={state.placingType}
          setIsSettingsModalOpen={state.setIsSettingsModalOpen}
          canvasSettings={state.canvasSettings}
          setCanvasSettings={state.setCanvasSettings}
          isTableOpen={state.isTableOpen}
          setIsTableOpen={state.setIsTableOpen}
          setIsCadExportOpen={state.setIsCadExportOpen}
          templateList={state.templateList}
          refreshTemplates={state.refreshTemplates}
          loadedFileName={state.loadedFileName}
          onExportCsv={exportCsv}
          onImportCsvFile={importCsvFile}
        />
      </ErrorBoundary>

      {/* EXPAND LEFT UI TAB (Visible when Sidebar is collapsed) */}
      {!state.showUI && (
        <button
          onClick={() => state.setShowUI(true)}
          title="Show Left Sidebar"
          className={`absolute left-0 top-16 z-40 p-1.5 pl-2 pr-2.5 border-y border-r shadow-lg rounded-r-md transition-all hover:pl-3 flex items-center gap-1 ${theme.buttonBg} ${theme.text} hover:border-blue-500`}
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* DUAL VIEWPORT AREA + TABLE */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ backgroundColor: theme.canvasBg }}>
        {(!state.isTableOpen || state.tableViewMode !== 'full') && (
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {state.activeView !== 'SIDE' && (
              <ErrorBoundary name="The TOP view" className="flex-1">
                <Viewport
                  {...viewportProps}
                  viewType="TOP"
                  title="TOP"
                  refObj={state.topViewRef}
                  scrollRef={state.topScrollRef}
                  planeCoord="z"
                  tracePoints={tracePointsTop}
                  tracePointsBranch={tracePointsTopBranch}
                />
              </ErrorBoundary>
            )}
            {state.activeView !== 'TOP' && (
              <ErrorBoundary name="The SIDE view" className="flex-1">
                <Viewport
                  {...viewportProps}
                  viewType="SIDE"
                  title="SIDE"
                  refObj={state.sideViewRef}
                  scrollRef={state.sideScrollRef}
                  planeCoord="y"
                  tracePoints={tracePointsSide}
                  tracePointsBranch={tracePointsSideBranch}
                />
              </ErrorBoundary>
            )}
          </div>
        )}

        {/* CONSTRUCTION SCHEDULE & SPATIAL CLEARANCE TABLE */}
        {state.isTableOpen && (
          <ErrorBoundary name="The Table Guide" className="h-64" onClose={() => state.setIsTableOpen(false)}>
            <TableView
              items={scheduleItems}
              setItems={state.setItems}
              selectedId={state.selectedId}
              selectedIds={state.selectedIds}
              setSelectedId={state.setSelectedId}
              canvasLength={state.canvasLength}
              theme={theme}
              isDarkMode={isDarkMode}
              onClose={() => state.setIsTableOpen(false)}
              viewMode={state.tableViewMode}
              setViewMode={state.setTableViewMode}
              onOpenCadExport={() => state.setIsCadExportOpen(true)}
              onFocusItem={state.focusItem}
              onImportCsvFile={importCsvFile}
              onExportCsv={exportCsv}
            />
          </ErrorBoundary>
        )}
      </div>

      {/* DOCKED RIGHT SIDE PROPERTIES WIDGET */}
      <ErrorBoundary
        name="The Properties panel"
        className="w-80"
        resetKey={state.selectedId}
        onClose={() => state.setSelectedId(null)}
      >
        <PropertiesWidget
          selectedItem={computedItems?.find(i => i.id === state.selectedId) || state.selectedItem}
          selectedCount={state.selectedIds.length}
          theme={theme}
          isDarkMode={isDarkMode}
          setSelectedId={state.setSelectedId}
          updateItemProp={state.updateItemProp}
          items={state.items}
          setItems={state.setItems}
          selectedId={state.selectedId}
          deleteSelected={state.deleteSelected}
          canvasSettings={state.canvasSettings}
          setCanvasSettings={state.setCanvasSettings}
          activeView={state.activeView}
        />
      </ErrorBoundary>

      {/* GLOBAL CANVAS SETTINGS MODAL */}
      <ErrorBoundary name="Canvas Settings" className="fixed bottom-4 right-4 z-[150] w-96 shadow-xl" onClose={() => state.setIsSettingsModalOpen(false)}>
        <SettingsModal
          isOpen={state.isSettingsModalOpen}
          onClose={() => state.setIsSettingsModalOpen(false)}
          canvasSettings={state.canvasSettings}
          setCanvasSettings={state.setCanvasSettings}
          items={state.items}
          setItems={state.setItems}
          theme={theme}
          isDarkMode={isDarkMode}
        />
      </ErrorBoundary>

      {/* CAD VECTOR SVG EXPORT MODAL */}
      <ErrorBoundary name="CAD export" className="fixed bottom-4 right-4 z-[150] w-96 shadow-xl" onClose={() => state.setIsCadExportOpen(false)}>
        <CadSvgExportModal
          isOpen={state.isCadExportOpen}
          onClose={() => state.setIsCadExportOpen(false)}
          items={state.items}
          canvasLength={state.canvasLength}
          theme={theme}
          isDarkMode={isDarkMode}
        />
      </ErrorBoundary>

      <ShortcutHelp
        isOpen={state.isShortcutHelpOpen}
        onClose={() => state.setIsShortcutHelpOpen(false)}
        theme={theme}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary variant="app">
      <BeamlineLayoutApp />
    </ErrorBoundary>
  );
}
