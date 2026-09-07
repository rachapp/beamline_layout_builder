import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  FileCode, Download, Copy, Check, X, GripHorizontal, Eye, Sliders, Layers, Sparkles 
} from 'lucide-react';
import { generateCadSvg, downloadCadSvg } from '../utils/constructionUtils';

let globalZIndexCounter = 135;

export const CadSvgExportModal = ({
  isOpen,
  onClose,
  items = [],
  canvasLength = 50,
  theme,
  isDarkMode
}) => {
  const [view, setView] = useState('BOTH'); // 'BOTH', 'TOP', 'SIDE'
  const [unit, setUnit] = useState('mm');    // 'mm', 'm', 'px'
  const [cadTheme, setCadTheme] = useState('dark'); // 'dark', 'light'
  const [beamlineTitle, setBeamlineTitle] = useState('BEAMLINE CONSTRUCTION LAYOUT & SPATIAL GUIDE');
  const [includeTitleBlock, setIncludeTitleBlock] = useState(true);
  const [includeClearance, setIncludeClearance] = useState(true);
  const [includeDimensions, setIncludeDimensions] = useState(true);
  const [includeGrid, setIncludeGrid] = useState(true);
  const [copied, setCopied] = useState(false);
  const [zIndex, setZIndex] = useState(135);

  // Position & dragging
  const [pos, setPos] = useState(() => {
    return {
      x: typeof window !== 'undefined' ? Math.max(20, Math.round((window.innerWidth - 680) / 2)) : 200,
      y: 60
    };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ offsetX: 0, offsetY: 0 });

  const bringToFront = () => {
    globalZIndexCounter += 1;
    setZIndex(globalZIndexCounter);
  };

  const handlePointerDown = (e) => {
    e.stopPropagation();
    bringToFront();
    setIsDragging(true);
    dragRef.current = {
      offsetX: e.clientX - pos.x,
      offsetY: e.clientY - pos.y
    };
  };

  useEffect(() => {
    if (!isDragging) return;
    const handlePointerMove = (e) => {
      const newX = Math.max(10, Math.min(window.innerWidth - 200, e.clientX - dragRef.current.offsetX));
      const newY = Math.max(10, Math.min(window.innerHeight - 100, e.clientY - dragRef.current.offsetY));
      setPos({ x: newX, y: newY });
    };
    const handlePointerUp = () => setIsDragging(false);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  // Generate SVG string whenever options or items change
  const svgString = useMemo(() => {
    if (!isOpen) return '';
    return generateCadSvg(items, {
      view,
      unit,
      canvasLength,
      beamlineName: beamlineTitle,
      includeTitleBlock,
      includeClearance,
      includeDimensions,
      includeGrid,
      isDark: cadTheme === 'dark'
    });
  }, [isOpen, items, canvasLength, view, unit, cadTheme, beamlineTitle, includeTitleBlock, includeClearance, includeDimensions, includeGrid]);

  const handleDownload = () => {
    const filename = `beamline_${view.toLowerCase()}_cad_guide_${unit}.svg`;
    downloadCadSvg(svgString, filename);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(svgString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed w-[700px] max-w-[95vw] flex flex-col shadow-2xl rounded-md border ${theme.panelBg} ${theme.panelBorder} ${theme.text}`}
      style={{ left: pos.x, top: pos.y, zIndex }}
      onClick={(e) => {
        e.stopPropagation();
        bringToFront();
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        bringToFront();
      }}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Draggable Header */}
      <div 
        className="flex items-center justify-between p-3 border-b bg-blue-600 text-white cursor-move select-none rounded-t-md"
        onPointerDown={handlePointerDown}
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <GripHorizontal size={16} className="text-white/70" />
          <Sparkles size={16} />
          <h2 className="font-bold tracking-wide text-xs uppercase">CAD Vector Layout Export (SVG)</h2>
        </div>
        <button 
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onClose} 
          className="text-white/80 hover:text-white hover:bg-blue-700/60 px-2 py-0.5 rounded font-bold text-lg leading-none"
          title="Close Dialog"
        >
          &times;
        </button>
      </div>

      {/* Options & Settings Panel */}
      <div className="p-4 flex flex-col gap-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
        {/* View & Unit Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* View Projection */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase opacity-70">Drawing Projection:</label>
            <select
              value={view}
              onChange={(e) => setView(e.target.value)}
              className={`p-1.5 text-xs font-bold border rounded outline-none ${theme.buttonBg} ${theme.text}`}
            >
              <option value="BOTH">Both (Plan + Elevation)</option>
              <option value="TOP">Plan View (TOP - Z vs X)</option>
              <option value="SIDE">Elevation View (SIDE - Y vs X)</option>
            </select>
          </div>

          {/* Unit Scale */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase opacity-70">CAD Unit Scale:</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className={`p-1.5 text-xs font-bold border rounded outline-none ${theme.buttonBg} ${theme.text}`}
            >
              <option value="mm">Millimeters 1:1 (1m = 1000mm)</option>
              <option value="m">Meters (1m = 100 units)</option>
              <option value="px">Canvas Pixels (1m = 20px)</option>
            </select>
          </div>

          {/* Canvas Styling */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase opacity-70">Visual Blueprint Theme:</label>
            <select
              value={cadTheme}
              onChange={(e) => setCadTheme(e.target.value)}
              className={`p-1.5 text-xs font-bold border rounded outline-none ${theme.buttonBg} ${theme.text}`}
            >
              <option value="dark">Dark CAD Canvas (AutoCAD Dark)</option>
              <option value="light">Light Paper Blueprint (White)</option>
            </select>
          </div>
        </div>

        {/* Drawing Title (Title Block) */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase opacity-70">Drawing Title (ANSI Title Block):</label>
            <span className="text-[10px] opacity-50">XML &amp; CAD Safe</span>
          </div>
          <input
            type="text"
            value={beamlineTitle}
            onChange={(e) => setBeamlineTitle(e.target.value)}
            placeholder="BEAMLINE CONSTRUCTION LAYOUT & SPATIAL GUIDE"
            className={`px-2.5 py-1.5 text-xs font-medium border rounded outline-none ${theme.buttonBg} ${theme.text}`}
          />
        </div>

        {/* Layer Content Toggles */}
        <div className={`p-3 border rounded flex flex-wrap items-center justify-between gap-3 text-xs ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-gray-100 border-gray-200'
        }`}>
          <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
            <input 
              type="checkbox"
              checked={includeTitleBlock}
              onChange={(e) => setIncludeTitleBlock(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0"
            />
            Title Block & Legend
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
            <input 
              type="checkbox"
              checked={includeDimensions}
              onChange={(e) => setIncludeDimensions(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0"
            />
            Station Dimensions
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
            <input 
              type="checkbox"
              checked={includeClearance}
              onChange={(e) => setIncludeClearance(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0"
            />
            Inter-Component Clearances (Gaps)
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
            <input 
              type="checkbox"
              checked={includeGrid}
              onChange={(e) => setIncludeGrid(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0"
            />
            Metric Grid
          </label>
        </div>

        {/* Live Vector SVG Preview Box */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase opacity-60">Live Vector Preview (CAD Compatible)</span>
            <span className="text-[10px] font-mono opacity-50">AutoCAD • FreeCAD • SolidWorks • Illustrator • QCAD</span>
          </div>
          <div 
            className={`w-full h-56 border rounded overflow-auto p-2 flex items-center justify-center ${
              cadTheme === 'dark' ? 'bg-[#090d16] border-slate-800' : 'bg-white border-gray-300'
            }`}
          >
            <div 
              className="w-full h-full flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: svgString }}
              style={{ maxHeight: '100%', maxWidth: '100%' }}
            />
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-400/30">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border rounded transition-colors ${theme.buttonBg} ${theme.text} hover:border-blue-500`}
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            <span>{copied ? 'SVG Markup Copied!' : 'Copy SVG Code'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`px-4 py-2 text-xs font-bold border rounded transition-colors ${theme.buttonBg} ${theme.text}`}
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-6 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded transition-all shadow-md active:scale-95"
            >
              <Download size={14} />
              <span>Download CAD SVG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
