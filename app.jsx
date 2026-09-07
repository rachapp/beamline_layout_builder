import React from 'react';
import { Moon, Sun, PanelLeftClose, PanelLeftOpen, Sliders, Table, Sparkles, FileDown } from 'lucide-react';

import { useTheme } from './src/hooks/useTheme';
import { usePhysicsEngine } from './src/hooks/usePhysicsEngine';
import { useBeamlineState } from './src/hooks/useBeamlineState';

import { Sidebar } from './src/components/Sidebar';
import { Viewport } from './src/components/Viewport';
import { PropertiesWidget } from './src/components/PropertiesWidget';
import { JsonModal } from './src/components/JsonModal';
import { SettingsModal } from './src/components/SettingsModal';
import { TableView } from './src/components/TableView';
import { CadSvgExportModal } from './src/components/CadSvgExportModal';
import { downloadCsv } from './src/utils/constructionUtils';

export default function App() {
  const { isDarkMode, setIsDarkMode, theme } = useTheme();
  
  // Initialize state with a placeholder, then use physics engine to compute
  const state = useBeamlineState([]);
  const { computedItems, tracePointsSide, tracePointsTop } = usePhysicsEngine(state.items);

  const rayColor = state.sourceItem.rayColor || theme.beam;
  const rayWidth = state.sourceItem.rayWidth ?? 1.5;
  const rayStyle = state.sourceItem.rayStyle || 'dashed';
  const showArrow = state.sourceItem.showArrow !== false;

  return (
    <div className={`flex h-screen w-full font-sans overflow-hidden select-none ${theme.bg}`}>
      
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
           onClick={() => downloadCsv(state.items, 'beamline_construction_schedule.csv', state.canvasLength)} 
           title="Export Construction Schedule Table to CSV (Excel compatible)" 
           className={`px-2.5 py-1.5 border shadow-sm rounded-none transition-colors flex items-center gap-1.5 text-xs font-bold ${theme.buttonBg} ${theme.text} hover:border-emerald-500 hover:text-emerald-500`}
         >
            <FileDown size={16} className="text-emerald-500" />
            <span className="hidden md:inline">Export CSV</span>
         </button>

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
        theme={theme}
        loadTemplate={state.loadTemplate}
        handleFitToScreen={state.handleFitToScreen}
        handleOpenJsonModal={state.handleOpenJsonModal}
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
        onExportCsv={() => downloadCsv(state.items, 'beamline_construction_schedule.csv', state.canvasLength)}
      />

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
            setEditingLabel={state.setEditingLabel}
            setItems={state.setItems}
            ghostPos={state.ghostPos}
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
            setEditingLabel={state.setEditingLabel}
            setItems={state.setItems}
            ghostPos={state.ghostPos}
            canvasSettings={state.canvasSettings}
          />
        )}
          </div>
        )}

        {/* CONSTRUCTION SCHEDULE & SPATIAL CLEARANCE TABLE */}
        {state.isTableOpen && (
          <TableView 
            items={state.items}
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
          />
        )}
      </div>

      {/* DRAGGABLE FLOATING PROPERTIES WIDGET */}
      <PropertiesWidget 
        selectedItem={state.selectedItem}
        widgetPos={state.widgetPos}
        theme={theme}
        isDarkMode={isDarkMode}
        setIsDraggingWidget={state.setIsDraggingWidget}
        widgetDragRef={state.widgetDragRef}
        setSelectedId={state.setSelectedId}
        updateItemProp={state.updateItemProp}
        items={state.items}
        setItems={state.setItems}
        selectedId={state.selectedId}
        deleteSelected={state.deleteSelected}
        canvasSettings={state.canvasSettings}
      />

      {/* JSON DATA PORTAL MODAL */}
      <JsonModal 
        isJsonModalOpen={state.isJsonModalOpen}
        setIsJsonModalOpen={state.setIsJsonModalOpen}
        jsonText={state.jsonText}
        setJsonText={state.setJsonText}
        theme={theme}
        isDarkMode={isDarkMode}
        handleApplyJson={state.handleApplyJson}
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
