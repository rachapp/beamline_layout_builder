import React from 'react';
import { Trash2, GripHorizontal } from 'lucide-react';
import { TYPES, PRESET_COLORS, PX_PER_M } from '../constants';
import { getDefaultColors } from '../utils';

export const PropertiesWidget = ({ 
  selectedItem, 
  widgetPos, 
  theme, 
  isDarkMode, 
  setIsDraggingWidget, 
  widgetDragRef, 
  setSelectedId, 
  updateItemProp, 
  items, 
  setItems, 
  selectedId, 
  deleteSelected 
}) => {
  if (!selectedItem) return null;
  
  return (
    <div 
      className={`absolute z-[100] w-72 border rounded-md flex flex-col ${theme.widgetBg} ${theme.text}`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      style={{ left: widgetPos.x, top: widgetPos.y }}
    >
      <div 
         className={`flex items-center justify-between cursor-move p-3 border-b rounded-t-md ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-100 border-gray-200'}`}
         onPointerDown={(e) => {
           e.stopPropagation();
           setIsDraggingWidget(true);
           widgetDragRef.current = {
              offsetX: e.clientX - widgetPos.x,
              offsetY: e.clientY - widgetPos.y
           };
         }}
      >
         <div className="flex items-center gap-2 pointer-events-none">
           <GripHorizontal size={14} className="text-gray-400" />
           <span className="inline-block px-2 py-1 bg-blue-500 text-white text-[10px] font-bold rounded-sm shadow-sm">
             {TYPES[selectedItem.type].name} Properties
           </span>
         </div>
         <button 
           onPointerDown={(e) => e.stopPropagation()}
           onClick={() => setSelectedId(null)} 
           className="text-gray-400 hover:text-red-500 font-bold p-1"
         >
           &times;
         </button>
      </div>

      <div className="p-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
        <div>
           <label className="flex items-center gap-2 text-[10px] font-bold uppercase cursor-pointer mb-2">
              <input 
                type="checkbox" 
                checked={selectedItem.showLabel !== false} 
                onChange={(e) => updateItemProp('showLabel', e.target.checked)} 
                className="w-4 h-4 rounded" 
              />
              Show Label
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
              setItems(items.map(i => i.id === selectedId ? { ...i, primaryColor: undefined, secondaryColor: undefined } : i));
            }}
            className={`w-full p-1 border rounded-none text-[10px] font-bold transition-colors ${theme.buttonBg} ${theme.text}`}
          >
            Reset Colors to Default
          </button>
        </div>

        {selectedItem.type === 'SOURCE' && (
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
        )}

        {selectedItem.type === 'DETECTOR' && (
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
        )}

        {(selectedItem.type === 'VDCM' || selectedItem.type === 'HDCM') && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1">Exit Offset (m)</label>
              <input
                type="number"
                step="0.01"
                value={selectedItem.exitOffset ?? 1.2}
                onChange={(e) => updateItemProp('exitOffset', parseFloat(e.target.value))}
                className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1">Bragg Angle (°)</label>
              <input
                type="number"
                step="0.1"
                value={selectedItem.braggAngle ?? 15}
                onChange={(e) => updateItemProp('braggAngle', parseFloat(e.target.value))}
                className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
              />
            </div>
          </div>
        )}

        {selectedItem.type === 'GRATING' && (
          <div className="grid grid-cols-2 gap-2">
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
                onChange={(e) => updateItemProp('diffractAngle', e.target.value)}
                className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1">Fine Tilt Offset (°)</label>
              <input
                type="number"
                value={selectedItem.tiltAngle ?? 0}
                onChange={(e) => updateItemProp('tiltAngle', e.target.value)}
                className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
              />
            </div>
            <p className="col-span-2 text-[9px] opacity-60 italic leading-tight">
              * The grating automatically aligns to bisect the deflection path. Use offset for fine-tuning blaze angles.
            </p>
          </div>
        )}

        {['SAMPLE', 'DETECTOR'].includes(selectedItem.type) && (
          <div>
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase cursor-pointer">
              <input 
                type="checkbox" 
                checked={selectedItem.type === 'DETECTOR' ? selectedItem.passLight === true : selectedItem.passLight !== false} 
                onChange={(e) => updateItemProp('passLight', e.target.checked)} 
                className="w-4 h-4 rounded" 
              />
              Pass Light Through
            </label>
          </div>
        )}

        {!['FILTER', 'SLIT', 'SCREEN', 'WALL', 'HUTCH', 'CHAMBER', 'VDCM', 'HDCM'].includes(selectedItem.type) && (
          <div>
             <label className="block text-[10px] font-bold uppercase mb-1 text-green-500">Physical Length (m)</label>
             <input
               type="number"
               step="0.1"
               value={selectedItem.length ?? (TYPES[selectedItem.type].defaultLength || (selectedItem.dimX / PX_PER_M))}
               onChange={(e) => updateItemProp('length', e.target.value)}
               className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text} border-green-400`}
             />
          </div>
        )}

        {['VDCM', 'HDCM'].includes(selectedItem.type) && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-green-500">Cryst 1 Len (m)</label>
              <input
                type="number"
                step="0.1"
                value={selectedItem.crystal1Length ?? TYPES[selectedItem.type].defaultCrystal1Length}
                onChange={(e) => updateItemProp('crystal1Length', e.target.value)}
                className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text} border-green-400`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-green-500">Cryst 2 Len (m)</label>
              <input
                type="number"
                step="0.1"
                value={selectedItem.crystal2Length ?? TYPES[selectedItem.type].defaultCrystal2Length}
                onChange={(e) => updateItemProp('crystal2Length', e.target.value)}
                className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text} border-green-400`}
              />
            </div>
          </div>
        )}
        {!['WALL', 'HUTCH'].includes(selectedItem.type) && (
          <div className="grid grid-cols-2 gap-2">
            <div>
               <label className="block text-[10px] font-bold uppercase mb-1">Height (m)</label>

               <input
                 type="number"
                 step="0.1"
                 value={selectedItem.height ?? 0}
                 onChange={(e) => updateItemProp('height', e.target.value)}
                 className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
               />
            </div>
            <div>
               <label className="block text-[10px] font-bold uppercase mb-1">Offset (m)</label>
               <input
                 type="number"
                 step="0.1"
                 value={selectedItem.offset ?? 0}
                 onChange={(e) => updateItemProp('offset', e.target.value)}
                 className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
               />
            </div>
          </div>
        )}

        {['WALL', 'HUTCH', 'CHAMBER'].includes(selectedItem.type) ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
               <label className="block text-[10px] font-bold uppercase mb-1">Start (m)</label>
               <input
                 type="number"
                 step="0.1"
                 value={selectedItem.start ?? 0}
                 onChange={(e) => updateItemProp('start', e.target.value)}
                 className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
               />
            </div>
            <div>
               <label className="block text-[10px] font-bold uppercase mb-1">End (m)</label>
               <input
                 type="number"
                 step="0.1"
                 value={selectedItem.end ?? 0}
                 onChange={(e) => updateItemProp('end', e.target.value)}
                 className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
               />
            </div>
          </div>
        ) : (
          <div>
             <label className="block text-[10px] font-bold uppercase mb-1">Distance (m)</label>
             <input
               type="number"
               step="0.1"
               value={selectedItem.distance ?? 0}
               onChange={(e) => updateItemProp('distance', e.target.value)}
               className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
             />
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
