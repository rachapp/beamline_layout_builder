import React from 'react';
import { Settings2, Trash2, Plus, Layers, Grid, Magnet, Maximize, Ruler, FileJson } from 'lucide-react';
import { TYPES, templates } from '../constants';

export const Sidebar = ({ 
  showUI, 
  theme, 
  loadTemplate, 
  handleFitToScreen, 
  handleOpenJsonModal, 
  handleClearAll, 
  showGrid, 
  setShowGrid, 
  snapToGrid, 
  setSnapToGrid, 
  showRuler, 
  setShowRuler, 
  canvasLength, 
  setCanvasLength, 
  activeView, 
  setActiveView, 
  addItem, 
  placingType 
}) => {
  return (
    <div className={`${showUI ? 'w-72 border-r' : 'w-0 overflow-hidden'} flex flex-col z-30 transition-all duration-300 ${theme.panelBg} ${theme.panelBorder} shadow-xl`}>
      <div className="p-4 bg-blue-600 text-white flex items-center gap-2">
        <Settings2 size={20} />
        <h1 className="font-bold text-lg tracking-wide whitespace-nowrap">Beamline Builder</h1>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
        <div className={`mb-6 p-4 border shadow-sm rounded-none ${theme.inactiveBg} ${theme.inactiveBorder}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${theme.text}`}>Canvas Controls</p>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col mb-1">
              <label className={`text-[10px] font-bold uppercase mb-0.5 ${theme.text}`}>Load Template</label>
              <select 
                onChange={(e) => loadTemplate(e.target.value)}
                className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
                defaultValue=""
              >
                <option value="" disabled>Select a preset...</option>
                {Object.keys(templates).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button onClick={handleFitToScreen} className={`flex items-center justify-center gap-1 p-2 border rounded-none text-xs font-bold transition-colors ${theme.buttonBg} ${theme.text}`}>
                <Maximize size={14} /> Fit to Screen
              </button>
              <button onClick={handleOpenJsonModal} className={`flex items-center justify-center gap-1 p-2 border rounded-none text-xs font-bold transition-colors ${theme.buttonBg} ${theme.text}`}>
                <FileJson size={14} /> JSON Port
              </button>
            </div>
            <button onClick={handleClearAll} className="w-full flex items-center justify-center gap-1 p-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 rounded-none text-xs font-bold transition-colors">
              <Trash2 size={14} /> Clear All
            </button>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button onClick={() => setShowGrid(!showGrid)} className={`flex items-center justify-center gap-1 p-2 border rounded-none text-xs font-bold transition-colors ${showGrid ? 'bg-blue-600 text-white border-blue-700' : `${theme.buttonBg} ${theme.text}`}`}>
                <Grid size={14} /> Grid
              </button>
              <button onClick={() => setSnapToGrid(!snapToGrid)} className={`flex items-center justify-center gap-1 p-2 border rounded-none text-xs font-bold transition-colors ${snapToGrid ? 'bg-blue-600 text-white border-blue-700' : `${theme.buttonBg} ${theme.text}`}`}>
                <Magnet size={14} /> Snap
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button onClick={() => setShowRuler(!showRuler)} className={`w-full flex items-center justify-center gap-1 p-2 border rounded-none text-xs font-bold transition-colors ${showRuler ? 'bg-blue-600 text-white border-blue-700' : `${theme.buttonBg} ${theme.text}`}`}>
                <Ruler size={14} /> Ruler
              </button>
              <div className="flex flex-col">
                <label className={`text-[10px] font-bold uppercase mb-0.5 ${theme.text}`}>Len (m)</label>
                <input
                  type="number"
                  value={canvasLength}
                  onChange={(e) => setCanvasLength(Math.max(1, Number(e.target.value)))}
                  className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <button onClick={() => setActiveView('TOP')} className={`flex items-center justify-center p-2 border rounded-none text-xs font-bold transition-colors ${activeView === 'TOP' ? 'bg-blue-600 text-white border-blue-700' : `${theme.buttonBg} ${theme.text}`}`}>
                TOP
              </button>
              <button onClick={() => setActiveView('BOTH')} className={`flex items-center justify-center p-2 border rounded-none text-xs font-bold transition-colors ${activeView === 'BOTH' ? 'bg-blue-600 text-white border-blue-700' : `${theme.buttonBg} ${theme.text}`}`}>
                BOTH
              </button>
              <button onClick={() => setActiveView('SIDE')} className={`flex items-center justify-center p-2 border rounded-none text-xs font-bold transition-colors ${activeView === 'SIDE' ? 'bg-blue-600 text-white border-blue-700' : `${theme.buttonBg} ${theme.text}`}`}>
                SIDE
              </button>
            </div>
          </div>
          <p className={`text-[10px] mt-3 opacity-60 text-center ${theme.text}`}>Tip: Use Mouse Wheel to Zoom</p>
        </div>

        <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${theme.text}`}>Add Optics</p>
        <div className="flex flex-col gap-2 mb-6">
          {['SOURCE', 'SLIT', 'FILTER', 'XBPM', 'GRATING', 'VDCM', 'HDCM', 'VFM', 'HFM', 'SAMPLE', 'SCREEN', 'DETECTOR'].map((key) => {
            const type = TYPES[key];
            return (
              <button key={type.id} onClick={() => addItem(type.id)} className={`flex items-center gap-3 p-3 border rounded-none transition-all text-left group ${placingType === type.id ? 'bg-blue-50 border-blue-400' : theme.buttonBg}`}>
                <Plus size={16} className="text-blue-500" />
                <span className={`text-sm font-bold ${theme.text}`}>{type.name}</span>
              </button>
            );
          })}
        </div>

        <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${theme.text}`}>Add Construction</p>
        <div className="flex flex-col gap-2 mb-6">
          {['WALL', 'HUTCH'].map((key) => {
            const type = TYPES[key];
            return (
              <button key={type.id} onClick={() => addItem(type.id)} className={`flex items-center gap-3 p-3 border rounded-none transition-all text-left group ${placingType === type.id ? 'bg-blue-50 border-blue-400' : theme.buttonBg}`}>
                <Plus size={16} className="text-blue-500" />
                <span className={`text-sm font-bold ${theme.text}`}>{type.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
