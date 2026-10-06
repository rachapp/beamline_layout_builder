import { RotateCcw } from 'lucide-react';
import { TYPES, isDcmType } from '../../constants';
import { getItemBoundsM } from '../../utils/constructionUtils';
import { BufferedNumberInput } from '../BufferedNumberInput';

/** The chamber / footprint box drawn around an optic: visibility, size and constraints. */
export const FootprintSection = ({ item: selectedItem, theme, updateItemProp, canvasSettings, setCanvasSettings }) => (
  <div className="p-3 border rounded-none bg-blue-500/5 border-blue-500/20 space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
        Chamber / Footprint Box
      </span>
      <button
        type="button"
        onClick={() => {
          const bounds = getItemBoundsM(selectedItem);
          const isDCM = isDcmType(selectedItem.type);
          const center = bounds.center ?? bounds.dist;
          let defaultChamberL;
          if (isDCM) {
            defaultChamberL = 1.5;
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
        <BufferedNumberInput
          step={0.05}
          value={getItemBoundsM(selectedItem).start}
          onChange={(val) => updateItemProp('start', val)}
          className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
          title="Upstream chamber entrance face coordinate"
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase mb-1 text-blue-600 dark:text-blue-400">
          Downstream X₂ (m)
        </label>
        <BufferedNumberInput
          step={0.05}
          value={getItemBoundsM(selectedItem).end}
          onChange={(val) => updateItemProp('end', val)}
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
      <BufferedNumberInput
        step={0.05}
        min={0.05}
        value={getItemBoundsM(selectedItem).len}
        onChange={(val) => updateItemProp('chamberLength', val)}
        className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
        title="Total length of the chamber envelope along the beamline"
      />
    </div>
  </div>
);
