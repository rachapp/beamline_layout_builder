import { Trash2, Lock } from 'lucide-react';
import { TYPES, isAnchorType, isWallType } from '../constants';
import { getDefaultColors } from '../utils';
import { AnchorProperties } from './properties/AnchorProperties';
import { EnclosureSection } from './properties/EnclosureSection';
import { OpticSection } from './properties/OpticSection';
import { FootprintSection } from './properties/FootprintSection';
import { ChamberSizeField } from './properties/ChamberSizeField';
import { SourceRaySection } from './properties/SourceRaySection';

/** Right-hand panel showing the properties of the selected component. */
export const PropertiesWidget = ({ 
  selectedItem, 
  selectedCount = 1,
  theme, 
  isDarkMode, 
  setSelectedId, 
  updateItemProp, 
  items, 
  setItems, 
  selectedId, 
  deleteSelected,
  canvasSettings,
  setCanvasSettings
}) => {
  if (!selectedItem) return null;

  const sectionProps = {
    item: selectedItem, theme, isDarkMode, updateItemProp, setItems, selectedId, items,
    canvasSettings, setCanvasSettings, deleteSelected
  };

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

      {selectedCount > 1 && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 text-[11px] border-b bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300">
          <span><b>{selectedCount} selected.</b> Showing {selectedItem.customName || TYPES[selectedItem.type].name}.</span>
          <button
            type="button"
            onClick={deleteSelected}
            className="flex items-center gap-1 px-2 py-0.5 font-bold text-white bg-red-500 hover:bg-red-600 rounded-sm"
            title="Delete all selected components (Delete)"
          >
            <Trash2 size={11} /> Delete {selectedCount}
          </button>
        </div>
      )}

      {isAnchorType(selectedItem.type) ? (
        <AnchorProperties {...sectionProps} />
      ) : (
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

        {isWallType(selectedItem.type) ? <EnclosureSection {...sectionProps} /> : <OpticSection {...sectionProps} />}

        {!isWallType(selectedItem.type) && <FootprintSection {...sectionProps} />}

        {selectedItem.type === 'CHAMBER' && <ChamberSizeField {...sectionProps} />}

        {selectedItem.type === 'SOURCE' && <SourceRaySection {...sectionProps} />}

        <button onClick={deleteSelected} className="w-full flex items-center justify-center gap-2 p-2 mt-2 bg-red-500 hover:bg-red-600 border border-red-700 text-white rounded-none transition-colors shadow-sm">
          <Trash2 size={14} />
          <span className="text-xs font-bold">Delete</span>
        </button>
      </div>
      )}
    </div>
  );
};
