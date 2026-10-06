import { RotateCcw } from 'lucide-react';
import { TYPES, PX_PER_M } from '../../constants';
import { getItemBoundsM } from '../../utils/constructionUtils';
import { BufferedNumberInput } from '../BufferedNumberInput';
import { LockControl } from './LockControl';

/** Position and size of a wall or hutch. */
export const EnclosureSection = ({ item: selectedItem, theme, updateItemProp }) => {
  const bounds = getItemBoundsM(selectedItem);
  const isWall = selectedItem.type === 'WALL';
  const labelPrefix = isWall ? 'Wall' : 'Hutch';
  return (
    <div className="p-3 border rounded-none bg-slate-500/5 border-slate-500/20 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {labelPrefix} Position & Dimensions
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

      <LockControl
        item={selectedItem}
        theme={theme}
        onToggle={() => updateItemProp('isLocked', !selectedItem.isLocked)}
        lockedLabel={`${labelPrefix} Movement: Locked`}
        unlockedLabel={`${labelPrefix} Movement: Unlocked`}
      />

      {/* Center Distance X & Thickness / Length */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-bold uppercase mb-1">
            Center Pos X (m)
          </label>
          <BufferedNumberInput
            step={0.05}
            value={bounds.dist}
            onChange={(val) => updateItemProp('distance', val)}
            className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
            title="Component centerline coordinate along beam axis"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
              {isWall ? 'Thickness (m)' : 'Length (m)'}
            </label>
            <button
              type="button"
              onClick={() => {
                const defaultLen = TYPES[selectedItem.type]?.defaultLength ?? (isWall ? 1.2 : 10.0);
                updateItemProp('length', defaultLen);
                updateItemProp('physicalLength', defaultLen);
              }}
              title={`Reset to default (${TYPES[selectedItem.type]?.defaultLength ?? (isWall ? 1.2 : 10.0)}m)`}
              className="text-gray-400 hover:text-emerald-600 transition-colors"
            >
              <RotateCcw size={10} />
            </button>
          </div>
          <BufferedNumberInput
            step={0.05}
            min={0.01}
            value={bounds.len}
            onChange={(val) => {
              updateItemProp('length', val);
              updateItemProp('physicalLength', val);
            }}
            className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text} border-emerald-500/40`}
            title={isWall ? "Thickness of the wall along the beamline" : "Length of the hutch along the beamline"}
          />
        </div>
      </div>

      {/* Upstream Face X1 and Downstream Face X2 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-bold uppercase mb-1 text-blue-600 dark:text-blue-400">
            Upstream X₁ (m)
          </label>
          <BufferedNumberInput
            step={0.05}
            value={bounds.start}
            onChange={(val) => updateItemProp('start', val)}
            className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
            title="Upstream entrance face coordinate"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase mb-1 text-blue-600 dark:text-blue-400">
            Downstream X₂ (m)
          </label>
          <BufferedNumberInput
            step={0.05}
            value={bounds.end}
            onChange={(val) => updateItemProp('end', val)}
            className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
            title="Downstream exit face coordinate"
          />
        </div>
      </div>

      {/* Lock Length & Lock Center constraints */}
      <div className="flex items-center gap-3 pt-1 border-t border-slate-500/20 text-[10px]">
        <label className="flex items-center gap-1.5 cursor-pointer" title="Lock length/thickness so editing upstream/downstream shifts the entire wall">
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
        <label className="flex items-center gap-1.5 cursor-pointer" title="Lock center position so editing upstream/downstream resizes symmetrically around center">
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

      {/* Construction Height & Width */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-500/20">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[10px] font-bold uppercase text-blue-500">
              {labelPrefix} Width (m)
            </label>
            <button
              type="button"
              onClick={() => updateItemProp('wallWidth', 7.0)}
              title="Reset width to default (7.0m)"
              className="text-gray-400 hover:text-blue-500"
            >
              <RotateCcw size={10} />
            </button>
          </div>
          <BufferedNumberInput
            step={0.1}
            min={0.1}
            value={selectedItem.wallWidth ?? (selectedItem.dimZ ? selectedItem.dimZ / PX_PER_M : 7.0)}
            onChange={(val) => updateItemProp('wallWidth', val)}
            className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text} border-blue-400`}
            title="Transverse lateral width across beamline (Top View)"
          />
          <span className="text-[9px] opacity-60 block mt-0.5">Top View (Z)</span>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[10px] font-bold uppercase text-blue-500">
              {labelPrefix} Height (m)
            </label>
            <button
              type="button"
              onClick={() => updateItemProp('wallHeight', 7.0)}
              title="Reset height to default (7.0m)"
              className="text-gray-400 hover:text-blue-500"
            >
              <RotateCcw size={10} />
            </button>
          </div>
          <BufferedNumberInput
            step={0.1}
            min={0.1}
            value={selectedItem.wallHeight ?? selectedItem.height ?? 7.0}
            onChange={(val) => updateItemProp('wallHeight', val)}
            className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text} border-blue-400`}
            title="Vertical height from floor (Side View)"
          />
          <span className="text-[9px] opacity-60 block mt-0.5">Side View (Y)</span>
        </div>
      </div>
    </div>
  );
};
