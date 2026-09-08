import React, { useState, useRef, useEffect } from 'react';
import { Sliders, RotateCcw, Type, Eye, EyeOff, GripHorizontal, Box } from 'lucide-react';

let globalZIndexCounter = 130;

export const SettingsModal = ({ 
  isOpen, 
  onClose, 
  canvasSettings, 
  setCanvasSettings, 
  items,
  setItems,
  theme, 
  isDarkMode 
}) => {
  const [zIndex, setZIndex] = useState(130);

  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem('beamline_settings_box_pos');
      if (saved) {
        const p = JSON.parse(saved);
        if (typeof p.x === 'number' && typeof p.y === 'number') {
          return {
            x: Math.max(10, Math.min(window.innerWidth - 300, p.x)),
            y: Math.max(10, Math.min(window.innerHeight - 100, p.y))
          };
        }
      }
    } catch (e) {}
    return {
      x: typeof window !== 'undefined' ? Math.max(20, window.innerWidth - 440) : 800,
      y: 70
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
      const newX = Math.max(10, Math.min(window.innerWidth - 120, e.clientX - dragRef.current.offsetX));
      const newY = Math.max(10, Math.min(window.innerHeight - 80, e.clientY - dragRef.current.offsetY));
      setPos({ x: newX, y: newY });
    };
    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  useEffect(() => {
    try {
      localStorage.setItem('beamline_settings_box_pos', JSON.stringify(pos));
    } catch (e) {}
  }, [pos]);

  if (!isOpen) return null;

  const handleSettingChange = (key, value) => {
    setCanvasSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleResetDefaults = () => {
    setCanvasSettings({
      showLabels: true,
      showFootprintBoxes: true,
      showFootprintText: true,
      textSize: 10,
      annotationTextSize: 9,
      rulerTextSize: 10,
      labelBold: false,
    });
  };

  const handleShowAllLabels = () => {
    handleSettingChange('showLabels', true);
    if (setItems) {
      setItems(prev => prev.map(item => ({ ...item, showLabel: true })));
    }
  };

  const handleHideAllLabels = () => {
    handleSettingChange('showLabels', false);
    if (setItems) {
      setItems(prev => prev.map(item => ({ ...item, showLabel: false })));
    }
  };

  const handleShowAllFootprints = () => {
    handleSettingChange('showFootprintBoxes', true);
    if (setItems) {
      setItems(prev => prev.map(item => ({ ...item, showFootprint: true })));
    }
  };

  const handleHideAllFootprints = () => {
    handleSettingChange('showFootprintBoxes', false);
    if (setItems) {
      setItems(prev => prev.map(item => ({ ...item, showFootprint: false })));
    }
  };

  const currentShowLabels = canvasSettings?.showLabels !== false;
  const currentShowFootprints = canvasSettings?.showFootprintBoxes !== false;
  const currentShowFootprintText = canvasSettings?.showFootprintText !== false;
  const currentTextSize = canvasSettings?.textSize ?? 10;
  const currentAnnotSize = canvasSettings?.annotationTextSize ?? 9;
  const currentRulerSize = canvasSettings?.rulerTextSize ?? 10;
  const currentBold = canvasSettings?.labelBold ?? false;

  const presets = [
    { label: 'XXS (4px)', size: 4 },
    { label: 'XS (6px)', size: 6 },
    { label: 'SM (8px)', size: 8 },
    { label: 'MD (10px)', size: 10 },
    { label: 'LG (12px)', size: 12 },
    { label: 'XL (16px)', size: 16 },
  ];

  return (
    <div 
      className={`fixed w-[400px] max-w-[95vw] flex flex-col shadow-2xl rounded-md border ${theme.panelBg} ${theme.panelBorder} ${theme.text}`}
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
          <Sliders size={16} />
          <h2 className="font-bold tracking-wide text-xs uppercase">Canvas Settings</h2>
        </div>
        <button 
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onClose} 
          className="text-white/80 hover:text-white hover:bg-blue-700/60 px-2 py-0.5 rounded font-bold text-lg leading-none"
          title="Close Settings"
        >
          &times;
        </button>
      </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Component Labels Section */}
          <div className="flex flex-col gap-3">
            <div className={`p-3 border rounded-none flex items-center justify-between transition-colors ${
              currentShowLabels 
                ? (isDarkMode ? 'bg-blue-950/40 border-blue-800' : 'bg-blue-50/70 border-blue-200')
                : (isDarkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-gray-100 border-gray-300')
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-2 border rounded-none ${
                  currentShowLabels 
                    ? 'bg-blue-600 text-white border-blue-700' 
                    : (isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-gray-400 border-gray-300')
                }`}>
                  {currentShowLabels ? <Eye size={18} /> : <EyeOff size={18} />}
                </div>
                <div>
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>
                    Component Labels
                  </h3>
                  <p className="text-[11px] opacity-70">
                    {currentShowLabels 
                      ? 'Labels are visible on canvas' 
                      : 'All labels are currently hidden'}
                  </p>
                </div>
              </div>

              {/* Master Visibility Toggle Button */}
              <button
                type="button"
                onClick={() => handleSettingChange('showLabels', !currentShowLabels)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border rounded-none transition-all shadow-sm ${
                  currentShowLabels
                    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700'
                    : `${theme.buttonBg} ${theme.text} hover:border-gray-400`
                }`}
                title={currentShowLabels ? 'Click to hide all labels' : 'Click to show labels'}
              >
                {currentShowLabels ? (
                  <>
                    <Eye size={13} />
                    <span>Visible</span>
                  </>
                ) : (
                  <>
                    <EyeOff size={13} />
                    <span>Hidden</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Action Buttons: Show All / Hide All */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleShowAllLabels}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-bold border rounded-none transition-all ${theme.buttonBg} ${theme.text} hover:border-blue-500 hover:text-blue-500`}
                title="Force show labels on all components"
              >
                <Eye size={13} className="text-blue-500" />
                <span>Show All Labels</span>
              </button>
              <button
                type="button"
                onClick={handleHideAllLabels}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-bold border rounded-none transition-all ${theme.buttonBg} ${theme.text} hover:border-red-500 hover:text-red-500`}
                title="Hide labels on all components"
              >
                <EyeOff size={13} className="text-red-500" />
                <span>Hide All Labels</span>
              </button>
            </div>

            {/* Component Label Size */}
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex items-center justify-between">
                <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${theme.text}`}>
                  <Type size={14} className="text-blue-500" /> Label Text Size
                </label>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 border rounded-none ${theme.badgeBg} ${theme.text}`}>
                  {currentTextSize}px
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input 
                  type="range" 
                  min="4" 
                  max="24" 
                  step="1"
                  value={currentTextSize}
                  onChange={(e) => handleSettingChange('textSize', parseInt(e.target.value))}
                  className="flex-1 cursor-pointer accent-blue-600"
                />
                <input 
                  type="number"
                  min="4"
                  max="24"
                  value={currentTextSize}
                  onChange={(e) => handleSettingChange('textSize', Math.max(4, Math.min(24, parseInt(e.target.value) || 4)))}
                  className={`w-14 text-xs font-bold border rounded-none p-1 text-center outline-none ${theme.buttonBg} ${theme.text}`}
                />
              </div>

              {/* Quick Presets */}
              <div className="flex gap-1.5 flex-wrap mt-1">
                {presets.map(p => (
                  <button
                    key={p.size}
                    onClick={() => handleSettingChange('textSize', p.size)}
                    className={`text-[10px] font-bold px-2 py-1 border rounded-none transition-colors ${
                      currentTextSize === p.size 
                        ? 'bg-blue-600 text-white border-blue-700' 
                        : `${theme.buttonBg} ${theme.text}`
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Label Boldness */}
              <label className={`flex items-center gap-2 text-xs font-bold mt-1 cursor-pointer select-none ${theme.text}`}>
                <input 
                  type="checkbox"
                  checked={currentBold}
                  onChange={(e) => handleSettingChange('labelBold', e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-0"
                />
                Bold Component Labels
              </label>
            </div>
          </div>

          {/* Chamber Footprint Boxes Section */}
          <div className="flex flex-col gap-3 pt-3 border-t border-dashed border-gray-400/40">
            <div className={`p-3 border rounded-none flex items-center justify-between transition-colors ${
              currentShowFootprints 
                ? (isDarkMode ? 'bg-cyan-950/40 border-cyan-800' : 'bg-cyan-50/70 border-cyan-200')
                : (isDarkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-gray-100 border-gray-300')
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-2 border rounded-none ${
                  currentShowFootprints 
                    ? 'bg-cyan-600 text-white border-cyan-700' 
                    : (isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-gray-400 border-gray-300')
                }`}>
                  <Box size={18} />
                </div>
                <div>
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>
                    Footprint Boxes
                  </h3>
                  <p className="text-[11px] opacity-70">
                    {currentShowFootprints 
                      ? 'Chamber envelopes visible on canvas' 
                      : 'All footprint boxes are hidden'}
                  </p>
                </div>
              </div>

              {/* Master Visibility Toggle Button */}
              <button
                type="button"
                onClick={() => handleSettingChange('showFootprintBoxes', !currentShowFootprints)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border rounded-none transition-all shadow-sm ${
                  currentShowFootprints
                    ? 'bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-700'
                    : `${theme.buttonBg} ${theme.text} hover:border-gray-400`
                }`}
                title={currentShowFootprints ? 'Click to hide all footprint boxes' : 'Click to show footprint boxes'}
              >
                {currentShowFootprints ? (
                  <>
                    <Eye size={13} />
                    <span>Visible</span>
                  </>
                ) : (
                  <>
                    <EyeOff size={13} />
                    <span>Hidden</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Action Buttons: Show All / Hide All */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleShowAllFootprints}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-bold border rounded-none transition-all ${theme.buttonBg} ${theme.text} hover:border-cyan-500 hover:text-cyan-500`}
                title="Enable footprint boxes on all components"
              >
                <Eye size={13} className="text-cyan-500" />
                <span>Show On All</span>
              </button>
              <button
                type="button"
                onClick={handleHideAllFootprints}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-bold border rounded-none transition-all ${theme.buttonBg} ${theme.text} hover:border-red-500 hover:text-red-500`}
                title="Disable footprint boxes on all components"
              >
                <EyeOff size={13} className="text-red-500" />
                <span>Hide On All</span>
              </button>
            </div>

            {/* Show Footprint Text Toggle */}
            <label className={`flex items-center gap-2 text-xs font-bold cursor-pointer select-none ${theme.text}`}>
              <input 
                type="checkbox"
                checked={currentShowFootprintText}
                onChange={(e) => handleSettingChange('showFootprintText', e.target.checked)}
                className="w-4 h-4 rounded text-cyan-600 focus:ring-0"
              />
              <span>Show Dimension Text <span className="font-mono text-[10px] text-cyan-500 font-bold">(L: ...m)</span> on Footprint Boxes</span>
            </label>
          </div>

          {/* Annotation Distance Text Size */}
          <div className="flex flex-col gap-2 pt-3 border-t border-dashed border-gray-400/40">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>
                Annotation Distance Text Size
              </label>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 border rounded-none ${theme.badgeBg} ${theme.text}`}>
                {currentAnnotSize}px
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input 
                type="range" 
                min="4" 
                max="18" 
                step="1"
                value={currentAnnotSize}
                onChange={(e) => handleSettingChange('annotationTextSize', parseInt(e.target.value))}
                className="flex-1 cursor-pointer accent-blue-600"
              />
              <input 
                type="number"
                min="4"
                max="18"
                value={currentAnnotSize}
                onChange={(e) => handleSettingChange('annotationTextSize', Math.max(4, Math.min(18, parseInt(e.target.value) || 4)))}
                className={`w-14 text-xs font-bold border rounded-none p-1 text-center outline-none ${theme.buttonBg} ${theme.text}`}
              />
            </div>
          </div>

          {/* Ruler Meter Tick Text Size */}
          <div className="flex flex-col gap-2 pt-3 border-t border-dashed border-gray-400/40">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>
                Ruler Axis Text Size
              </label>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 border rounded-none ${theme.badgeBg} ${theme.text}`}>
                {currentRulerSize}px
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input 
                type="range" 
                min="4" 
                max="16" 
                step="1"
                value={currentRulerSize}
                onChange={(e) => handleSettingChange('rulerTextSize', parseInt(e.target.value))}
                className="flex-1 cursor-pointer accent-blue-600"
              />
              <input 
                type="number"
                min="4"
                max="16"
                value={currentRulerSize}
                onChange={(e) => handleSettingChange('rulerTextSize', Math.max(4, Math.min(16, parseInt(e.target.value) || 4)))}
                className={`w-14 text-xs font-bold border rounded-none p-1 text-center outline-none ${theme.buttonBg} ${theme.text}`}
              />
            </div>
          </div>

          {/* Live Preview */}
          <div className="flex flex-col gap-1.5 pt-3 border-t border-dashed border-gray-400/40">
            <p className={`text-[10px] font-bold uppercase ${theme.text} opacity-60`}>Live Text Preview</p>
            <div className={`p-3 border rounded-none flex items-center justify-around ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-gray-100 border-gray-300'}`}>
              <div className="text-center">
                <span className="text-[9px] block opacity-50 mb-0.5">Label</span>
                <span 
                  style={{ 
                    fontSize: `${currentTextSize}px`,
                    fontWeight: currentBold ? '700' : 'normal',
                    color: isDarkMode ? '#cbd5e1' : '#334155',
                    opacity: currentShowLabels ? 1 : 0.35,
                    textDecoration: currentShowLabels ? 'none' : 'line-through'
                  }}
                >
                  VDCM Mono
                </span>
                {!currentShowLabels && (
                  <span className="text-[9px] font-bold text-red-500 block mt-0.5">
                    (Hidden)
                  </span>
                )}
              </div>
              <div className="text-center">
                <span className="text-[9px] block opacity-50 mb-0.5">Distance Badge</span>
                <span 
                  className={`inline-block px-1.5 py-0.5 border rounded ${isDarkMode ? 'bg-slate-950 border-slate-700 text-slate-300' : 'bg-white border-gray-300 text-slate-700'}`}
                  style={{ 
                    fontSize: `${currentAnnotSize}px`,
                    fontWeight: 'bold'
                  }}
                >
                  12.50m
                </span>
              </div>
              <div className="text-center">
                <span className="text-[9px] block opacity-50 mb-0.5">Ruler</span>
                <span 
                  style={{ 
                    fontSize: `${currentRulerSize}px`,
                    fontWeight: 'bold',
                    color: isDarkMode ? '#94a3b8' : '#64748b'
                  }}
                >
                  15m
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-400/40">
            <button 
              onClick={handleResetDefaults}
              className={`flex items-center gap-1 px-3 py-2 text-xs font-bold border rounded-none transition-colors opacity-80 hover:opacity-100 ${theme.buttonBg} ${theme.text}`}
            >
              <RotateCcw size={12} /> Reset Defaults
            </button>
            <button 
              onClick={onClose}
              className="px-6 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-none transition-all shadow-md active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      </div>
  );
};
