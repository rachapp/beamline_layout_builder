import React, { useEffect } from 'react';
import { Moon, Sun, PanelLeftClose, PanelLeftOpen, Sliders, Table, Sparkles, FileDown, FileUp, ChevronRight } from 'lucide-react';

import { useTheme } from './src/hooks/useTheme';
import { usePhysicsEngine } from './src/hooks/usePhysicsEngine';
import { useBeamlineState } from './src/hooks/useBeamlineState';

import { Sidebar } from './src/components/Sidebar';
import { Viewport } from './src/components/Viewport';
import { PropertiesWidget } from './src/components/PropertiesWidget';
import { SettingsModal } from './src/components/SettingsModal';
import { TableView } from './src/components/TableView';
import { CadSvgExportModal } from './src/components/CadSvgExportModal';
import { downloadCsv } from './src/utils/constructionUtils';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Beamline App ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen w-full bg-slate-900 text-white p-6">
          <div className="bg-slate-800 border border-red-500 rounded-lg p-6 max-w-lg shadow-xl text-center">
            <h2 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-300 mb-4">{this.state.error?.message || 'An unexpected rendering error occurred.'}</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded text-sm transition-colors"
              >
                Reload Application
              </button>
              <button
                onClick={() => {
                  try { localStorage.clear(); } catch(e) {}
                  window.location.reload();
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-gray-200 font-semibold rounded text-sm transition-colors"
              >
                Reset & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function BeamlineLayoutApp() {
  const { isDarkMode, setIsDarkMode, theme } = useTheme();
  
  // Initialize state with a placeholder, then use physics engine to compute
  const state = useBeamlineState([]);
  const { computedItems, tracePointsSide, tracePointsTop, tracePointsSideBranch, tracePointsTopBranch } = usePhysicsEngine(state.items);

  useEffect(() => {
    state.setComputedItems?.(computedItems);
  }, [computedItems]);

  const rayColor = state.sourceItem?.rayColor || theme.beam;
  const rayWidth = state.sourceItem?.rayWidth ?? 1.5;
  const rayStyle = state.sourceItem?.rayStyle || 'dashed';
  const showArrow = state.sourceItem?.showArrow !== false;

  return (
    <div className={`flex h-screen w-full font-sans overflow-hidden select-none ${isDarkMode ? 'dark ' : ''}${theme.bg}`}>
      
      {/* FLOATING GLOBAL TOOLBAR */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
         {/* Construction Table Schedule Toggle */}
         <button 
           onClick={() => state.setIsTableOpen(!state.isTableOpen)} 
           title={state.isTableOpen ? "Hide Construction Table Schedule" : "Open Construction Schedule & Clearance Table"} 
           className={`px-2.5 py-1.5 border shadow-sm rounded-none transition-colors flex items-center gap-1.5 text-xs font-bold ${
             state.isTableOpen ? 'bg-blue-600 text-white border-blue-700' : `${theme.buttonBg} ${theme.text} hover:border-blue-500`
           }`}
         >
            <Table size={16} className={state.isTableOpen ? 'text-white' : 'text-blue-500'} />
            <span className="hidden md:inline">Table Guide</span>
         </button>

         {/* CAD Vector Export Button */}
         <button 
           onClick={() => state.setIsCadExportOpen(true)} 
           title="Export CAD Vector Blueprint (SVG)" 
           className={`px-2.5 py-1.5 border shadow-sm rounded-none transition-colors flex items-center gap-1.5 text-xs font-bold ${theme.buttonBg} ${theme.text} hover:border-blue-500`}
         >
            <Sparkles size={16} className="text-blue-500" />
            <span className="hidden md:inline">CAD SVG</span>
         </button>

         {/* Export Table to CSV Button */}
         <button 
           onClick={() => downloadCsv(computedItems && computedItems.length > 0 ? computedItems : state.items, 'beamline_construction_schedule.csv', state.canvasLength)} 
           title="Export Construction Schedule Table to CSV (Excel compatible)" 
           className={`px-2.5 py-1.5 border shadow-sm rounded-none transition-colors flex items-center gap-1.5 text-xs font-bold ${theme.buttonBg} ${theme.text} hover:border-emerald-500 hover:text-emerald-500`}
         >
            <FileDown size={16} className="text-emerald-500" />
            <span className="hidden md:inline">Export CSV</span>
         </button>

         {/* Import CSV Button */}
         <label 
           title="Import Beamline from CSV File" 
           className={`px-2.5 py-1.5 border shadow-sm rounded-none transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer ${theme.buttonBg} ${theme.text} hover:border-emerald-500 hover:text-emerald-500`}
         >
            <FileUp size={16} className="text-emerald-500" />
            <span className="hidden md:inline">Import CSV</span>
            <input 
              type="file" 
              accept=".csv,text/csv" 
              className="hidden" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                  if (evt.target?.result) state.handleImportCsv(evt.target.result);
                };
                reader.readAsText(file);
                e.target.value = '';
              }} 
            />
         </label>

         <button 
           onClick={() => state.setIsSettingsModalOpen(true)} 
           title="Global Canvas Settings (Text Size, etc.)" 
           className={`p-2 border shadow-sm rounded-none transition-colors ${theme.buttonBg} ${theme.text}`}
         >
            <Sliders size={18} />
         </button>
         <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 border shadow-sm rounded-none transition-colors ${theme.buttonBg} ${theme.text}`}>
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
         </button>
         <button onClick={() => state.setShowUI(!state.showUI)} className={`p-2 border shadow-sm rounded-none transition-colors ${theme.buttonBg} ${theme.text}`}>
            {state.showUI ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
         </button>
      </div>

      {/* SIDEBAR PALETTE */}
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
        items={state.items}
        templateList={state.templateList}
        refreshTemplates={state.refreshTemplates}
        loadedFileName={state.loadedFileName}
        setLoadedFileName={state.setLoadedFileName}
        onExportCsv={() => downloadCsv(computedItems && computedItems.length > 0 ? computedItems : state.items, 'beamline_construction_schedule.csv', state.canvasLength)}
        onImportCsv={state.handleImportCsv}
      />

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
              <Viewport 
            viewType="TOP"
            title="TOP"
            refObj={state.topViewRef}
            scrollRef={state.topScrollRef}
            planeCoord="z"
            tracePoints={tracePointsTop}
            tracePointsBranch={tracePointsTopBranch}
            theme={theme}
            draggingInfo={state.draggingInfo}
            placingType={state.placingType}
            pan={state.pan}
            zoom={state.zoom}
            showGrid={state.showGrid}
            showRuler={state.showRuler}
            showAnnotations={state.showAnnotations}
            canvasWidth={state.canvasWidth}
            isDarkMode={isDarkMode}
            computedItems={computedItems}
            selectedId={state.selectedId}
            setSelectedId={state.setSelectedId}
            editingLabel={state.editingLabel}
            rayColor={rayColor}
            rayWidth={rayWidth}
            rayStyle={rayStyle}
            showArrow={showArrow}
            sourceItem={state.sourceItem}
            handleBgPointerDown={state.handleBgPointerDown}
            handlePointerMove={state.handlePointerMove}
            handlePointerUp={state.handlePointerUp}
            handleWheel={state.handleWheel}
            handlePointerDown={state.handlePointerDown}
            handleResizePointerDown={state.handleResizePointerDown}
            handleLabelPointerDown={state.handleLabelPointerDown}
            handleLabelDoubleClick={state.handleLabelDoubleClick}
            cancelFocusItem={state.cancelFocusItem}
            setEditingLabel={state.setEditingLabel}
            setItems={state.setItems}
            ghostPos={state.ghostPos}
            ghostBranch={state.ghostBranch}
            setGhostBranch={state.setGhostBranch}
            canvasSettings={state.canvasSettings}
          />
        )}

        {state.activeView !== 'TOP' && (
          <Viewport 
            viewType="SIDE"
            title="SIDE"
            refObj={state.sideViewRef}
            scrollRef={state.sideScrollRef}
            planeCoord="y"
            tracePoints={tracePointsSide}
            tracePointsBranch={tracePointsSideBranch}
            theme={theme}
            draggingInfo={state.draggingInfo}
            placingType={state.placingType}
            pan={state.pan}
            zoom={state.zoom}
            showGrid={state.showGrid}
            showRuler={state.showRuler}
            showAnnotations={state.showAnnotations}
            canvasWidth={state.canvasWidth}
            isDarkMode={isDarkMode}
            computedItems={computedItems}
            selectedId={state.selectedId}
            setSelectedId={state.setSelectedId}
            editingLabel={state.editingLabel}
            rayColor={rayColor}
            rayWidth={rayWidth}
            rayStyle={rayStyle}
            showArrow={showArrow}
            sourceItem={state.sourceItem}
            handleBgPointerDown={state.handleBgPointerDown}
            handlePointerMove={state.handlePointerMove}
            handlePointerUp={state.handlePointerUp}
            handleWheel={state.handleWheel}
            handlePointerDown={state.handlePointerDown}
            handleResizePointerDown={state.handleResizePointerDown}
            handleLabelPointerDown={state.handleLabelPointerDown}
            handleLabelDoubleClick={state.handleLabelDoubleClick}
            cancelFocusItem={state.cancelFocusItem}
            setEditingLabel={state.setEditingLabel}
            setItems={state.setItems}
            ghostPos={state.ghostPos}
            ghostBranch={state.ghostBranch}
            setGhostBranch={state.setGhostBranch}
            canvasSettings={state.canvasSettings}
          />
        )}
          </div>
        )}

        {/* CONSTRUCTION SCHEDULE & SPATIAL CLEARANCE TABLE */}
        {state.isTableOpen && (
          <TableView 
            items={computedItems && computedItems.length > 0 ? computedItems : state.items}
            setItems={state.setItems}
            selectedId={state.selectedId}
            setSelectedId={state.setSelectedId}
            canvasLength={state.canvasLength}
            theme={theme}
            isDarkMode={isDarkMode}
            onClose={() => state.setIsTableOpen(false)}
            viewMode={state.tableViewMode}
            setViewMode={state.setTableViewMode}
            onOpenCadExport={() => state.setIsCadExportOpen(true)}
            onFocusItem={state.focusItem}
            onImportCsv={state.handleImportCsv}
            onExportCsv={() => downloadCsv(computedItems && computedItems.length > 0 ? computedItems : state.items, 'beamline_construction_schedule.csv', state.canvasLength)}
          />
        )}
      </div>

      {/* DOCKED RIGHT SIDE PROPERTIES WIDGET */}
      <PropertiesWidget 
        selectedItem={computedItems?.find(i => i.id === state.selectedId) || state.selectedItem}
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

      {/* GLOBAL CANVAS SETTINGS MODAL */}
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

      {/* CAD VECTOR SVG EXPORT MODAL */}
      <CadSvgExportModal 
        isOpen={state.isCadExportOpen}
        onClose={() => state.setIsCadExportOpen(false)}
        items={state.items}
        canvasLength={state.canvasLength}
        theme={theme}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BeamlineLayoutApp />
    </ErrorBoundary>
  );
}
