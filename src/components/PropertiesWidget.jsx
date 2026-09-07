import React from 'react';
import { Trash2, Lock, Unlock, Crosshair, RotateCcw } from 'lucide-react';
import { TYPES, PRESET_COLORS, PX_PER_M } from '../constants';
import { getDefaultColors } from '../utils';
import { getItemBoundsM, getOpticPhysicalLengthM, getItemMiscParams, setItemMiscParam } from '../utils/constructionUtils';

export const PropertiesWidget = ({ 
  selectedItem, 
  theme, 
  isDarkMode, 
  setSelectedId, 
  updateItemProp, 
  items, 
  setItems, 
  selectedId, 
  deleteSelected,
  canvasSettings,
  setCanvasSettings,
  activeView 
}) => {
  if (!selectedItem) return null;
  
  const misc = getItemMiscParams(selectedItem, activeView);
  const currentLabelX = misc.labelX;
  const currentLabelY = misc.labelY;
  
  return (
    <div 
      className={`w-80 h-full border-l flex flex-col z-30 shadow-xl overflow-hidden shrink-0 ${theme.widgetBg} ${theme.text} ${theme.panelBorder}`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div 
         className={`flex items-center justify-between p-3 border-b ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-100 border-gray-200'}`}
      >
         <div className="flex items-center gap-2">
           <span className="inline-block px-2 py-1 bg-blue-500 text-white text-[10px] font-bold rounded-sm shadow-sm">
             {TYPES[selectedItem.type].name} Properties
           </span>
         </div>
         <div className="flex items-center gap-1.5">
           <button
             onClick={() => updateItemProp('isLocked', !selectedItem.isLocked)}
             title={selectedItem.isLocked ? "Unlock Optics (Figure can be moved on canvas)" : "Lock Optics (Figure cannot be moved accidentally)"}
             className={`px-2 py-1 rounded transition-colors flex items-center gap-1 text-[11px] font-bold ${
               selectedItem.isLocked 
                 ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm' 
                 : (isDarkMode ? 'bg-slate-800 hover:bg-slate-600 text-slate-300' : 'bg-white hover:bg-gray-200 text-gray-700 border border-gray-300')
             }`}
           >
             <Lock size={12} />
             <span>{selectedItem.isLocked ? 'Locked' : 'Lock'}</span>
           </button>
           <button 
             onClick={() => setSelectedId(null)} 
             title="Close Properties Panel"
             className="text-gray-400 hover:text-red-500 font-bold p-1 rounded transition-colors text-lg leading-none"
           >
             &times;
           </button>
         </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
        <div>
           <label className="flex items-center gap-2 text-[10px] font-bold uppercase cursor-pointer mb-2">
              <input 
                type="checkbox" 
                checked={selectedItem.showLabel !== false} 
                onChange={(e) => updateItemProp('showLabel', e.target.checked)} 
                className="w-4 h-4 rounded" 
              />
              <span>Show Label</span>
              {canvasSettings?.showLabels === false && (
                <span className="text-[9px] text-amber-500 font-normal lowercase tracking-normal">
                  (globally hidden)
                </span>
              )}
           </label>
           <label className="block text-[10px] font-bold uppercase mb-1">Label Name</label>
           <input 
             type="text" 
             value={selectedItem.customName || ''} 
             placeholder={TYPES[selectedItem.type].name} 
             onChange={(e) => updateItemProp('customName', e.target.value)} 
             className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
           />
        </div>
        <div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1">Major Color</label>
              <input 
                type="color" 
                value={selectedItem.primaryColor || getDefaultColors(selectedItem.type, isDarkMode, theme).primary} 
                onChange={(e) => updateItemProp('primaryColor', e.target.value)} 
                className="w-full h-8 p-0 border-0 cursor-pointer" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1">Minor Color</label>
              <input 
                type="color" 
                value={selectedItem.secondaryColor || getDefaultColors(selectedItem.type, isDarkMode, theme).secondary} 
                onChange={(e) => updateItemProp('secondaryColor', e.target.value)} 
                className="w-full h-8 p-0 border-0 cursor-pointer" 
              />
            </div>
          </div>
          <button 
            onClick={() => {
              setItems(prev => prev.map(i => i.id === selectedId ? { ...i, primaryColor: undefined, secondaryColor: undefined } : i));
            }}
            className={`w-full p-1 border rounded-none text-[10px] font-bold transition-colors ${theme.buttonBg} ${theme.text}`}
          >
            Reset Colors to Default
          </button>
        </div>

        {/* BEAMLINE OPTICS CENTER & PHYSICAL DIMENSIONS (CONSOLIDATED UNIFIED BOX) */}
        {!['WALL', 'HUTCH'].includes(selectedItem.type) ? (
          <div className="p-3 border rounded-none bg-slate-500/5 border-slate-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Optics Center & Physical Dimensions
              </span>
              <button
                type="button"
                onClick={() => updateItemProp('distance', 0)}
                title="Reset center position to 0m"
                className="flex items-center gap-1 text-[9px] font-bold text-gray-400 hover:text-blue-500 transition-colors"
              >
                <RotateCcw size={10} />
                <span>Reset Pos (0m)</span>
              </button>
            </div>

            {/* Lock Figure / Mouse Movement Control */}
            <div className={`p-2 border rounded-none flex items-center justify-between transition-colors ${
              selectedItem.isLocked 
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200' 
                : `${theme.buttonBg} border-gray-300 dark:border-slate-700`
            }`}>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-none ${selectedItem.isLocked ? 'bg-amber-500 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300'}`}>
                  {selectedItem.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block">
                    {selectedItem.isLocked ? 'Optics Movement: Locked' : 'Optics Movement: Unlocked'}
                  </span>
                  <span className="text-[9px] opacity-70 block">
                    {selectedItem.isLocked ? 'Mouse drag & arrow keys disabled' : 'Can be dragged & moved freely with mouse'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateItemProp('isLocked', !selectedItem.isLocked)}
                className={`px-2.5 py-1 text-xs font-bold border rounded-none transition-all flex items-center gap-1 shadow-sm ${
                  selectedItem.isLocked
                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
                    : `${theme.buttonBg} ${theme.text} hover:border-amber-500 hover:text-amber-500`
                }`}
                title={selectedItem.isLocked ? "Click to unlock optics figure for mouse moving" : "Click to lock optics figure from accidental mouse movement"}
              >
                {selectedItem.isLocked ? <Unlock size={12} /> : <Lock size={12} />}
                <span>{selectedItem.isLocked ? 'Unlock' : 'Lock Figure'}</span>
              </button>
            </div>

            {/* Center Distance X & Optics Physical Length */}
            {(() => {
              const showOpticPhysLen = !['VDCM', 'HDCM', 'SCREEN', 'SLIT', 'XBPM'].includes(selectedItem.type);
              return (
                <>
                  <div className={showOpticPhysLen ? "grid grid-cols-2 gap-2" : "space-y-2"}>
                    <div>
                      <label className="block text-[10px] font-bold uppercase mb-1">
                        Center Pos X (m)
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        value={getItemBoundsM(selectedItem).dist}
                        onChange={(e) => updateItemProp('distance', e.target.value)}
                        className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
                        title="Component centerline coordinate along beam axis"
                      />
                    </div>

                    {showOpticPhysLen && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                            Optic Phys Len (m)
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const defaultLen = TYPES[selectedItem.type]?.defaultLength ?? 1.0;
                              updateItemProp('physicalLength', defaultLen);
                              updateItemProp('length', defaultLen);
                            }}
                            title={`Reset physical length to default (${TYPES[selectedItem.type]?.defaultLength ?? 1.0}m)`}
                            className="text-gray-400 hover:text-emerald-600 transition-colors"
                          >
                            <RotateCcw size={10} />
                          </button>
                        </div>
                        <input
                          type="number"
                          step="0.05"
                          min="0.01"
                          value={selectedItem.physicalLength ?? selectedItem.length ?? (TYPES[selectedItem.type]?.defaultLength || 1.0)}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              updateItemProp('physicalLength', val);
                              updateItemProp('length', val);
                            }
                          }}
                          className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text} border-emerald-500/40`}
                          title="Physical length of the optics. Visualizes the optic body on the canvas. Does NOT change chamber footprint."
                        />
                      </div>
                    )}
                  </div>

                  {showOpticPhysLen && (
                    <p className="text-[9px] opacity-60 italic leading-tight">
                      * Physical length visualizes optic element on canvas. Center pos coordinates along beamline.
                    </p>
                  )}
                </>
              );
            })()}

            {/* Height Y and Offset Z */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-500/20">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold uppercase">Height Y (m)</label>
                  <button
                    type="button"
                    onClick={() => updateItemProp('height', 0)}
                    title="Reset height to 0"
                    className="text-gray-400 hover:text-blue-500"
                  >
                    <RotateCcw size={10} />
                  </button>
                </div>
                <input
                  type="number"
                  step="0.05"
                  value={selectedItem.height ?? 0}
                  onChange={(e) => updateItemProp('height', e.target.value)}
                  className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold uppercase">Offset Z (m)</label>
                  <button
                    type="button"
                    onClick={() => updateItemProp('offset', 0)}
                    title="Reset offset to 0"
                    className="text-gray-400 hover:text-blue-500"
                  >
                    <RotateCcw size={10} />
                  </button>
                </div>
                <input
                  type="number"
                  step="0.05"
                  value={selectedItem.offset ?? 0}
                  onChange={(e) => updateItemProp('offset', e.target.value)}
                  className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
                />
              </div>
            </div>

            {/* TYPE-SPECIFIC OPTICS PROPERTIES (CONSOLIDATED HERE) */}

            {/* 1. SOURCE SPECIFIC */}
            {selectedItem.type === 'SOURCE' && (
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-500/20">
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-1">Source Type</label>
                  <select
                    value={selectedItem.sourceType || 'Undulator'}
                    onChange={(e) => updateItemProp('sourceType', e.target.value)}
                    className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
                  >
                    <option value="Undulator">Undulator</option>
                    <option value="Wiggler">Wiggler</option>
                    <option value="Bending Magnet">Bending Magnet</option>
                  </select>
                </div>
                {selectedItem.sourceType !== 'Bending Magnet' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase mb-1">Period (mm)</label>
                      <input
                        type="number"
                        value={selectedItem.periodLength ?? (selectedItem.sourceType === 'Wiggler' ? 100 : 50)}
                        onChange={(e) => updateItemProp('periodLength', parseFloat(e.target.value))}
                        className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase mb-1">Num Periods</label>
                      <input
                        type="number"
                        value={selectedItem.numPeriods ?? (selectedItem.sourceType === 'Wiggler' ? 20 : 40)}
                        onChange={(e) => updateItemProp('numPeriods', parseInt(e.target.value))}
                        className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. VDCM / HDCM SPECIFIC */}
            {['VDCM', 'HDCM'].includes(selectedItem.type) && (
              <div className="space-y-2 pt-2 border-t border-slate-500/20">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1">Exit Offset (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={selectedItem.exitOffset !== undefined && selectedItem.exitOffset !== null ? selectedItem.exitOffset : 0.5}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateItemProp('exitOffset', val === '' ? '' : parseFloat(val));
                      }}
                      className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1">Bragg Angle (°)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={selectedItem.braggAngle !== undefined && selectedItem.braggAngle !== null ? selectedItem.braggAngle : 20}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateItemProp('braggAngle', val === '' ? '' : parseFloat(val));
                      }}
                      className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
                    />
                  </div>
                </div>

                {/* DCM CRYSTAL LENGTHS */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-500/20">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold uppercase text-blue-500">Cryst 1 Len (m)</label>
                      <button
                        type="button"
                        onClick={() => updateItemProp('crystal1Length', TYPES[selectedItem.type]?.defaultCrystal1Length || 1.0)}
                        title="Reset Crystal 1 length to default"
                        className="text-gray-400 hover:text-blue-500"
                      >
                        <RotateCcw size={10} />
                      </button>
                    </div>
                    <input
                      type="number"
                      step="0.05"
                      value={selectedItem.crystal1Length ?? TYPES[selectedItem.type]?.defaultCrystal1Length ?? 1.0}
                      onChange={(e) => updateItemProp('crystal1Length', parseFloat(e.target.value))}
                      className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold uppercase text-blue-500">Cryst 2 Len (m)</label>
                      <button
                        type="button"
                        onClick={() => updateItemProp('crystal2Length', TYPES[selectedItem.type]?.defaultCrystal2Length || 1.0)}
                        title="Reset Crystal 2 length to default"
                        className="text-gray-400 hover:text-blue-500"
                      >
                        <RotateCcw size={10} />
                      </button>
                    </div>
                    <input
                      type="number"
                      step="0.05"
                      value={selectedItem.crystal2Length ?? TYPES[selectedItem.type]?.defaultCrystal2Length ?? 1.0}
                      onChange={(e) => updateItemProp('crystal2Length', parseFloat(e.target.value))}
                      className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. GRATING SPECIFIC */}
            {selectedItem.type === 'GRATING' && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-500/20">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase mb-1">Dispersion Plane</label>
                  <select
                    value={selectedItem.orientation || 'Vertical'}
                    onChange={(e) => updateItemProp('orientation', e.target.value)}
                    className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
                  >
                    <option value="Vertical">Vertical (Side View)</option>
                    <option value="Horizontal">Horizontal (Top View)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-1">Deflect Beam (°)</label>
                  <input
                    type="number"
                    value={selectedItem.diffractAngle ?? 15}
                    onChange={(e) => updateItemProp('diffractAngle', parseFloat(e.target.value) || 0)}
                    className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-1">Fine Tilt Offset (°)</label>
                  <input
                    type="number"
                    value={selectedItem.tiltAngle ?? 0}
                    onChange={(e) => updateItemProp('tiltAngle', parseFloat(e.target.value) || 0)}
                    className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
                  />
                </div>
                <p className="col-span-2 text-[9px] opacity-60 italic leading-tight">
                  * The grating automatically aligns to bisect the deflection path. Use offset for fine-tuning blaze angles.
                </p>
              </div>
            )}

            {/* 4. MIRRORS (VFM / HFM) SPECIFIC */}
            {['VFM', 'HFM'].includes(selectedItem.type) && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-500/20">
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-1">Grazing / Deflect (°)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={selectedItem.grazingAngle ?? selectedItem.deflectAngle ?? 0}
                    onChange={(e) => updateItemProp('grazingAngle', parseFloat(e.target.value) || 0)}
                    className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-1">Focal Length (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedItem.focalLength ?? ''}
                    placeholder="e.g. 5.0"
                    onChange={(e) => updateItemProp('focalLength', parseFloat(e.target.value) || '')}
                    className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
                  />
                </div>
              </div>
            )}

            {/* 5. DETECTOR SPECIFIC */}
            {selectedItem.type === 'DETECTOR' && (
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-500/20">
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-1">Detector Type</label>
                  <select
                    value={selectedItem.detectorType || 'Silicon Detector'}
                    onChange={(e) => updateItemProp('detectorType', e.target.value)}
                    className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
                  >
                    <option value="Ionization Chamber">Ionization Chamber</option>
                    <option value="Silicon Detector">Silicon Detector</option>
                    <option value="Image Plate">Image Plate</option>
                    <option value="Strip Detector">Strip Detector</option>
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-[10px] font-bold uppercase cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedItem.passLight === true} 
                      onChange={(e) => updateItemProp('passLight', e.target.checked)} 
                      className="w-4 h-4 rounded" 
                    />
                    Pass Light
                  </label>
                  <label className="flex items-center gap-2 text-[10px] font-bold uppercase cursor-pointer" title="Stay positioned in optical path">
                    <input 
                      type="checkbox" 
                      checked={selectedItem.stayInPath !== false} 
                      onChange={(e) => updateItemProp('stayInPath', e.target.checked)} 
                      className="w-4 h-4 rounded" 
                    />
                    Stay In Path
                  </label>
                </div>
              </div>
            )}

            {/* 6. SAMPLE SPECIFIC */}
            {selectedItem.type === 'SAMPLE' && (
              <div className="pt-2 border-t border-slate-500/20">
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={selectedItem.passLight !== false} 
                    onChange={(e) => updateItemProp('passLight', e.target.checked)} 
                    className="w-4 h-4 rounded" 
                  />
                  Pass Light Through
                </label>
              </div>
            )}

            {/* 7. CANVAS LABEL POSITION TRACKING */}
            <div className="pt-2 border-t border-slate-500/20">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">
                  Canvas Label Tracking (px)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const updated = {
                      ...selectedItem,
                      labelOffsetX: 0,
                      labelOffsetY: 0,
                      labelOffsets: {
                        ...(selectedItem.labelOffsets || {}),
                        SIDE: { x: 0, y: 0 },
                        TOP: { x: 0, y: 0 }
                      }
                    };
                    setItems(prev => prev.map(i => i.id === selectedId ? updated : i));
                  }}
                  title="Reset label offset positions to default"
                  className="flex items-center gap-1 text-[9px] font-bold text-gray-400 hover:text-blue-500 transition-colors"
                >
                  <RotateCcw size={10} />
                  <span>Reset Pos</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-[9px] font-semibold opacity-70 mb-0.5">Offset X</span>
                  <input
                    type="number"
                    step="1"
                    value={currentLabelX}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setItems(prev => prev.map(i => i.id === selectedId ? setItemMiscParam(i, 'labelX', val, activeView) : i));
                    }}
                    className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
                  />
                </div>
                <div>
                  <span className="block text-[9px] font-semibold opacity-70 mb-0.5">Offset Y</span>
                  <input
                    type="number"
                    step="1"
                    value={currentLabelY}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setItems(prev => prev.map(i => i.id === selectedId ? setItemMiscParam(i, 'labelY', val, activeView) : i));
                    }}
                    className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
                  />
                </div>
              </div>
              <p className="text-[9px] opacity-60 mt-1 italic leading-tight">
                * Tracked & saved to CSV/Table. Preserves custom visual label positioning on reload.
              </p>
            </div>

          </div>
        ) : (
          /* Enclosure / Wall position */
          <div className="p-2.5 border rounded-none bg-slate-500/5 border-slate-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold uppercase mb-1">Center Distance X (m)</label>
              <button
                type="button"
                onClick={() => updateItemProp('distance', 0)}
                title="Reset position to 0m"
                className="flex items-center gap-1 text-[9px] font-bold text-gray-400 hover:text-blue-500 transition-colors"
              >
                <RotateCcw size={10} />
                <span>Reset (0m)</span>
              </button>
            </div>
            <input
              type="number"
              step="0.05"
              value={getItemBoundsM(selectedItem).dist}
              onChange={(e) => updateItemProp('distance', e.target.value)}
              className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
            />
          </div>
        )}

        {/* CHAMBER / FOOTPRINT BOX ENVELOPE */}
        {!['WALL', 'HUTCH'].includes(selectedItem.type) && (
          <div className="p-3 border rounded-none bg-blue-500/5 border-blue-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                Chamber / Footprint Box
              </span>
              <button
                type="button"
                onClick={() => {
                  const bounds = getItemBoundsM(selectedItem);
                  const isDCM = ['VDCM', 'HDCM'].includes(selectedItem.type);
                  const center = bounds.center ?? bounds.dist;
                  let defaultChamberL;
                  if (isDCM) {
                    const parsedD = parseFloat(selectedItem.exitOffset);
                    const d_m = !isNaN(parsedD) ? parsedD : 0.5;
                    const parsedTh = parseFloat(selectedItem.braggAngle);
                    const th_deg = !isNaN(parsedTh) ? parsedTh : 20;
                    const tan2th = Math.tan(2 * th_deg * Math.PI / 180);
                    const L_m = Math.abs(tan2th) > 0.001 ? Math.abs(d_m / tan2th) : 2.0;
                    defaultChamberL = parseFloat((L_m + 1.2).toFixed(3));
                  } else {
                    const physL = selectedItem.physicalLength ?? selectedItem.length ?? (TYPES[selectedItem.type]?.defaultLength || 1.0);
                    defaultChamberL = parseFloat((physL + 0.6).toFixed(3));
                  }
                  updateItemProp('start', parseFloat((center - defaultChamberL / 2).toFixed(3)));
                  updateItemProp('end', parseFloat((center + defaultChamberL / 2).toFixed(3)));
                  updateItemProp('chamberLength', defaultChamberL);
                  updateItemProp('freeDownstream', false);
                }}
                title="Reset chamber to symmetric default clearance"
                className="flex items-center gap-1 text-[9px] font-bold text-gray-400 hover:text-blue-500 transition-colors"
              >
                <RotateCcw size={10} />
                <span>Reset Box</span>
              </button>
            </div>

            {/* Footprint Box & Text (L:) Toggles */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={Boolean(selectedItem.showFootprint)} 
                  onChange={(e) => {
                    updateItemProp('showFootprint', e.target.checked);
                    if (e.target.checked && canvasSettings?.showFootprintBoxes === false && setCanvasSettings) {
                      setCanvasSettings(prev => ({ ...prev, showFootprintBoxes: true }));
                    }
                  }} 
                  className="w-4 h-4 rounded text-blue-600" 
                />
                <span>Show Footprint Box</span>
              </label>

              {/* Show text (L:) toggle next to Show Footprint Box */}
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase cursor-pointer" title="Show dimension text (L: ...m) on the footprint box">
                <input 
                  type="checkbox" 
                  checked={Boolean(selectedItem.showFootprintText)} 
                  onChange={(e) => updateItemProp('showFootprintText', e.target.checked)} 
                  className="w-3.5 h-3.5 rounded text-blue-600" 
                />
                <span className={selectedItem.showFootprintText ? 'text-blue-600 dark:text-blue-400 font-bold' : 'opacity-60'}>
                  Text (L:)
                </span>
              </label>
            </div>

            {/* LOCK LENGTH & LOCK CENTER (Chamber Envelope Constraints) */}
            <div className="flex items-center gap-3 pt-1.5 border-t border-blue-500/20 text-[10px]">
              <label className="flex items-center gap-1.5 cursor-pointer" title="Lock chamber footprint length so editing upstream/downstream shifts the entire chamber envelope">
                <input
                  type="checkbox"
                  checked={Boolean(selectedItem.lockLength)}
                  onChange={(e) => updateItemProp('lockLength', e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer"
                />
                <span className={selectedItem.lockLength ? 'font-bold text-blue-600 dark:text-blue-400' : ''}>
                  Lock Length
                </span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer" title="Lock chamber center position so editing upstream/downstream resizes symmetrically around center">
                <input
                  type="checkbox"
                  checked={Boolean(selectedItem.lockCenter)}
                  onChange={(e) => updateItemProp('lockCenter', e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-purple-600 cursor-pointer"
                />
                <span className={selectedItem.lockCenter ? 'font-bold text-purple-600 dark:text-purple-400' : ''}>
                  Lock Center
                </span>
              </label>
            </div>

            {/* Asymmetric / Freely adjust downstream toggle */}
            <div className="pt-1.5 border-t border-blue-500/20">
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase cursor-pointer" title="Check to freely adjust downstream face independently without symmetric constraint">
                <input 
                  type="checkbox" 
                  checked={Boolean(selectedItem.freeDownstream)} 
                  onChange={(e) => updateItemProp('freeDownstream', e.target.checked)} 
                  className="w-4 h-4 rounded text-purple-600" 
                />
                <span className={selectedItem.freeDownstream ? 'text-purple-600 dark:text-purple-400 font-bold' : ''}>
                  Freely adjust downstream (Asymmetric)
                </span>
              </label>
              <p className="text-[9px] opacity-60 mt-0.5 italic leading-tight">
                {selectedItem.freeDownstream 
                  ? 'Asymmetric: Upstream and downstream faces can be sized independently.' 
                  : 'Symmetric: Adjusting upstream or downstream mirrors clearance equally.'}
              </p>
            </div>

            {/* Upstream & Downstream Inputs */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1 text-blue-600 dark:text-blue-400">
                  Upstream X₁ (m)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={getItemBoundsM(selectedItem).start}
                  onChange={(e) => updateItemProp('start', e.target.value)}
                  className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
                  title="Upstream chamber entrance face coordinate"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1 text-blue-600 dark:text-blue-400">
                  Downstream X₂ (m)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={getItemBoundsM(selectedItem).end}
                  onChange={(e) => updateItemProp('end', e.target.value)}
                  className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
                  title="Downstream chamber exit face coordinate"
                />
              </div>
            </div>

            {/* Chamber Total Length */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold uppercase">
                  Chamber Total Length (m)
                </label>
                <span className="text-[9px] font-mono opacity-60">
                  Span: {getItemBoundsM(selectedItem).len} m
                </span>
              </div>
              <input
                type="number"
                step="0.05"
                min="0.05"
                value={getItemBoundsM(selectedItem).len}
                onChange={(e) => updateItemProp('chamberLength', e.target.value)}
                className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
                title="Total length of the chamber envelope along the beamline"
              />
            </div>
          </div>
        )}

        {['HUTCH', 'WALL', 'CHAMBER'].includes(selectedItem.type) && (
          <div>
            <label className="block text-[10px] font-bold uppercase mb-1 text-blue-500">Construction Height / Width (m)</label>
            <input
              type="number"
              step="0.1"
              value={selectedItem.height ?? (TYPES[selectedItem.type].height / PX_PER_M)}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setItems(items.map(i => {
                  if (i.id === selectedId) {
                     const h = isNaN(val) ? 0 : val;
                     const isChamber = i.type === 'CHAMBER';
                     return { 
                       ...i, 
                       height: h, 
                       dimY: h * PX_PER_M, 
                       dimZ: h * PX_PER_M,
                       y: isChamber ? i.y : 200 - (h * PX_PER_M) / 2
                     };
                  }
                  return i;
                }));
              }}
              className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text} border-blue-400`}
            />
            <p className="text-[9px] opacity-60 mt-1 italic leading-tight">* Height applies to Side View. Width applies to Top View.</p>
          </div>
        )}

        {selectedItem.type === 'SOURCE' && (
          <div className="mt-2 pt-3 border-t border-dashed border-gray-400">
            <p className="text-[10px] font-bold uppercase mb-2">Ray Trace Setup</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <div className="flex gap-2 items-center">
                  <input type="color" value={selectedItem.rayColor || '#ef4444'} onChange={(e) => updateItemProp('rayColor', e.target.value)} className="w-8 h-8 p-0 border-0 cursor-pointer" />
                  <div className="flex flex-wrap gap-1 flex-1 items-center">
                    {PRESET_COLORS.slice(0,6).map(c => (
                        <button key={c} onClick={() => updateItemProp('rayColor', c)} className="w-4 h-4 rounded-full border border-gray-400" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1">Ray Width</label>
                <input type="number" step="0.5" value={selectedItem.rayWidth ?? 1.5} onChange={(e) => updateItemProp('rayWidth', parseFloat(e.target.value))} className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1">Line Style</label>
                <select value={selectedItem.rayStyle || 'dashed'} onChange={(e) => updateItemProp('rayStyle', e.target.value)} className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}>
                   <option value="solid">Solid</option>
                   <option value="dashed">Dashed</option>
                   <option value="dotted">Dotted</option>
                </select>
              </div>
              <div className="col-span-2 mt-1 flex flex-col gap-2">
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase cursor-pointer">
                  <input type="checkbox" checked={selectedItem.showArrow !== false} onChange={(e) => updateItemProp('showArrow', e.target.checked)} className="w-4 h-4 rounded" />
                  Draw Directional Arrows
                </label>
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase cursor-pointer">
                  <input type="checkbox" checked={selectedItem.animate !== false} onChange={(e) => updateItemProp('animate', e.target.checked)} className="w-4 h-4 rounded" />
                  Animate Ray Path
                </label>
              </div>
            </div>
          </div>
        )}

        <button onClick={deleteSelected} className="w-full flex items-center justify-center gap-2 p-2 mt-2 bg-red-500 hover:bg-red-600 border border-red-700 text-white rounded-none transition-colors shadow-sm">
          <Trash2 size={14} />
          <span className="text-xs font-bold">Delete</span>
        </button>
      </div>
    </div>
  );
};
