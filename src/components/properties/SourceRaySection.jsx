import { PRESET_COLORS } from '../../constants';
import { BufferedNumberInput } from '../BufferedNumberInput';

/** Ray colour, width and style, set on the Source. */
export const SourceRaySection = ({ item: selectedItem, theme, updateItemProp }) => (
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
        <BufferedNumberInput
          step={0.5}
          min={0.5}
          value={selectedItem.rayWidth ?? 1.5}
          onChange={(val) => updateItemProp('rayWidth', val)}
          className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
        />
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
);
