import React from 'react';
import { Moon, Sun, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { useTheme } from './src/hooks/useTheme';
import { usePhysicsEngine } from './src/hooks/usePhysicsEngine';
import { useBeamlineState } from './src/hooks/useBeamlineState';

import { Sidebar } from './src/components/Sidebar';
import { Viewport } from './src/components/Viewport';
import { PropertiesWidget } from './src/components/PropertiesWidget';
import { JsonModal } from './src/components/JsonModal';

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
      <div className="absolute top-4 right-4 z-50 flex gap-2">
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
        canvasLength={state.canvasLength}
        setCanvasLength={state.setCanvasLength}
        activeView={state.activeView}
        setActiveView={state.setActiveView}
        addItem={state.addItem}
        placingType={state.placingType}
      />

      {/* DUAL VIEWPORT AREA */}
      <div className="flex-1 flex flex-col min-w-0" style={{ backgroundColor: theme.canvasBg }}>
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
    </div>
  );
}
