import React, { useRef } from 'react';
import { Settings2, Trash2, Plus, Layers, Grid, Magnet, Maximize, Ruler, Tag, Sliders, Type, Table, Sparkles, FileDown, FileUp, ChevronLeft, RefreshCw } from 'lucide-react';
import { TYPES, templates } from '../constants';

export const Sidebar = ({ 
  showUI, 
  setShowUI,
  theme, 
  loadTemplate, 
  handleFitToScreen, 
  handleClearAll, 
  showGrid, 
  setShowGrid, 
  snapToGrid, 
  setSnapToGrid, 
  showRuler, 
  setShowRuler, 
  showAnnotations,
  setShowAnnotations,
  canvasLength, 
  setCanvasLength, 
  activeView, 
  setActiveView, 
  addItem, 
  placingType,
  setIsSettingsModalOpen,
  canvasSettings,
  setCanvasSettings,
  isTableOpen,
  setIsTableOpen,
  setIsCadExportOpen,
  items = [],
  templateList = [],
  refreshTemplates,
  loadedFileName = '',
  setLoadedFileName,
  onExportCsv,
  onImportCsv
}) => {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (text && onImportCsv) {
        onImportCsv(text);
        if (setLoadedFileName) setLoadedFileName(file.name);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  return (
    <div className={`${showUI ? 'w-72 border-r' : 'w-0 overflow-hidden'} flex flex-col z-30 transition-all duration-300 ${theme.panelBg} ${theme.panelBorder} shadow-xl`}>
      <div className="p-4 bg-blue-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          <Settings2 size={20} className="shrink-0" />
          <h1 className="font-bold text-lg tracking-wide whitespace-nowrap">Beamline Builder</h1>
        </div>
        {setShowUI && (
          <button 
            onClick={() => setShowUI(false)}
            title="Hide Left Sidebar"
            className="p-1 text-white/80 hover:text-white hover:bg-blue-700 rounded transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
        <div className={`mb-6 p-4 border shadow-sm rounded-none ${theme.inactiveBg} ${theme.inactiveBorder}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${theme.text}`}>Canvas Controls</p>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col mb-1">
              <div className="flex items-center justify-between mb-0.5">
                <label className={`text-[10px] font-bold uppercase ${theme.text}`}>Load Template (CSV)</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] opacity-60 font-mono">templates/</span>
                  {refreshTemplates && (
                    <button 
                      type="button"
                      onClick={() => refreshTemplates()} 
                      title="Reload templates directly from templates/ folder"
                      className="opacity-60 hover:opacity-100 transition-opacity p-0.5 hover:text-blue-500"
                    >
                      <RefreshCw size={10} />
                    </button>
                  )}
                </div>
              </div>
              <select 
                value={loadedFileName || ""}
                onFocus={() => refreshTemplates && refreshTemplates()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__browse__') {
                    fileInputRef.current?.click();
                  } else if (val) {
                    loadTemplate(val);
                  }
                }}
                className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
              >
                <option value="" disabled>
                  {loadedFileName ? loadedFileName : "Select a CSV preset..."}
                </option>
                {((templateList && templateList.length > 0)
                  ? templateList
                  : Object.keys(templates).map(name => ({ name, fileName: `${name}.csv` }))
                ).map(t => {
                  const fName = t.fileName || (t.name.endsWith('.csv') ? t.name : `${t.name}.csv`);
                  return (
                    <option key={fName} value={fName}>
                      {fName}
                    </option>
                  );
                })}
                {loadedFileName && !templateList.some(t => (t.fileName === loadedFileName || t.name === loadedFileName || `${t.name}.csv` === loadedFileName)) && (
                  <option value={loadedFileName}>{loadedFileName}</option>
                )}
                <option value="__browse__">📂 Browse CSV from folder...</option>
              </select>
            </div>
            <div className="mt-1">
              <button 
                onClick={() => handleFitToScreen()} 
                title="Fit entire beamline to screen"
                className={`w-full flex items-center justify-center gap-1.5 p-2 border rounded-none text-xs font-bold transition-colors ${theme.buttonBg} ${theme.text}`}
              >
                <Maximize size={14} /> Fit to Screen
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button 
                onClick={() => setIsTableOpen && setIsTableOpen(!isTableOpen)} 
                className={`flex items-center justify-center gap-1.5 p-2 border rounded-none text-xs font-bold transition-colors ${
                  isTableOpen ? 'bg-blue-600 text-white border-blue-700' : `${theme.buttonBg} ${theme.text}`
                }`}
                title="Toggle Construction Schedule Table & Clearance Guide"
              >
                <Table size={14} className={isTableOpen ? 'text-white' : 'text-blue-500'} /> Table Guide
              </button>
              <button 
                onClick={() => setIsCadExportOpen && setIsCadExportOpen(true)} 
                className={`flex items-center justify-center gap-1.5 p-2 border rounded-none text-xs font-bold transition-colors ${theme.buttonBg} ${theme.text} hover:border-blue-500 hover:text-blue-500`}
                title="Export vector CAD blueprint (SVG)"
              >
                <Sparkles size={14} className="text-blue-500" /> CAD (SVG)
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button 
                onClick={() => onExportCsv && onExportCsv()} 
                className={`w-full flex items-center justify-center gap-1.5 p-2 border rounded-none text-xs font-bold transition-colors ${theme.buttonBg} ${theme.text} hover:border-emerald-500 hover:text-emerald-500`}
                title="Download construction schedule spreadsheet (.csv) for Excel"
              >
                <FileDown size={14} className="text-emerald-500" /> Export CSV
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className={`w-full flex items-center justify-center gap-1.5 p-2 border rounded-none text-xs font-bold transition-colors ${theme.buttonBg} ${theme.text} hover:border-emerald-500 hover:text-emerald-500`}
                title="Import layout and components from CSV spreadsheet"
              >
                <FileUp size={14} className="text-emerald-500" /> Import CSV
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                accept=".csv,text/csv" 
                className="hidden" 
                onChange={handleFileChange} 
              />
            </div>
            <button 
              onClick={() => setIsSettingsModalOpen(true)} 
              className={`w-full flex items-center justify-center gap-1.5 p-2 border rounded-none text-xs font-bold transition-colors ${theme.buttonBg} ${theme.text}`}
            >
              <Sliders size={14} className="text-blue-500" /> Canvas Settings
            </button>
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
            <div className="grid grid-cols-3 gap-1.5 mt-1">
              <button onClick={() => setShowRuler(!showRuler)} className={`w-full flex items-center justify-center gap-1 p-2 border rounded-none text-[11px] font-bold transition-colors ${showRuler ? 'bg-blue-600 text-white border-blue-700' : `${theme.buttonBg} ${theme.text}`}`}>
                <Ruler size={13} /> Ruler
              </button>
              <button onClick={() => setShowAnnotations(!showAnnotations)} className={`w-full flex items-center justify-center gap-1 p-2 border rounded-none text-[11px] font-bold transition-colors ${showAnnotations ? 'bg-blue-600 text-white border-blue-700' : `${theme.buttonBg} ${theme.text}`}`}>
                <Tag size={13} /> Annotate
              </button>
              <button 
                onClick={() => setCanvasSettings && setCanvasSettings(prev => ({ ...prev, showLabels: prev?.showLabels === false ? true : false }))} 
                className={`w-full flex items-center justify-center gap-1 p-2 border rounded-none text-[11px] font-bold transition-colors ${(canvasSettings?.showLabels !== false) ? 'bg-blue-600 text-white border-blue-700' : `${theme.buttonBg} ${theme.text}`}`}
                title="Toggle Component Labels visibility"
              >
                <Type size={13} /> Labels
              </button>
            </div>
            <div className="flex flex-col mt-1">
              <label className={`text-[10px] font-bold uppercase mb-0.5 ${theme.text}`}>Len (m)</label>
              <input
                type="number"
                value={canvasLength}
                onChange={(e) => setCanvasLength(Math.max(1, Number(e.target.value)))}
                className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <button 
                onClick={() => setActiveView('TOP')} 
                title="Switch to Top View & Fit to Screen"
                className={`flex items-center justify-center p-2 border rounded-none text-xs font-bold transition-colors ${activeView === 'TOP' ? 'bg-blue-600 text-white border-blue-700' : `${theme.buttonBg} ${theme.text}`}`}
              >
                TOP
              </button>
              <button 
                onClick={() => setActiveView('BOTH')} 
                title="Switch to Both Views & Fit to Screen"
                className={`flex items-center justify-center p-2 border rounded-none text-xs font-bold transition-colors ${activeView === 'BOTH' ? 'bg-blue-600 text-white border-blue-700' : `${theme.buttonBg} ${theme.text}`}`}
              >
                BOTH
              </button>
              <button 
                onClick={() => setActiveView('SIDE')} 
                title="Switch to Side View & Fit to Screen"
                className={`flex items-center justify-center p-2 border rounded-none text-xs font-bold transition-colors ${activeView === 'SIDE' ? 'bg-blue-600 text-white border-blue-700' : `${theme.buttonBg} ${theme.text}`}`}
              >
                SIDE
              </button>
            </div>
          </div>
          <p className={`text-[10px] mt-3 opacity-60 text-center ${theme.text}`}>Tip: Use Mouse Wheel to Zoom</p>
        </div>

        <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${theme.text}`}>Add Optics</p>
        <div className="flex flex-col gap-2 mb-6">
          {['SOURCE', 'SLIT', 'FILTER', 'XBPM', 'GRATING', 'VDCM', 'HDCM', 'VFM', 'HFM', 'SAMPLE', 'SCREEN', 'DETECTOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'].map((key) => {
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
