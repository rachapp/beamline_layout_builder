import { RotateCcw } from 'lucide-react';
import { getItemMiscParams, setItemMiscParam } from '../../utils/constructionUtils';
import { BufferedNumberInput } from '../BufferedNumberInput';

/** Manual label offsets for the SIDE and TOP views. */
export const LabelTrackingFields = ({ item: selectedItem, theme, setItems, selectedId }) => {
  const misc = getItemMiscParams(selectedItem);
  const sideLabelX = misc.labelSideX;
  const sideLabelY = misc.labelSideY;
  const topLabelX = misc.labelTopX;
  const topLabelY = misc.labelTopY;
  return (
    <div className="pt-2 border-t border-slate-500/20">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">
          Canvas Label Tracking (px)
        </label>
        <button
          type="button"
          onClick={() => {
            // Edit the stored item, not `selectedItem`: that is the ray-traced copy and carries computed fields.
            setItems(prev => prev.map(i => {
              if (i.id !== selectedId) return i;
              const { labelOffsetX: _x, labelOffsetY: _y, labelOffsets: _offsets, ...rest } = i;
              return rest;
            }));
          }}
          title="Reset label offset positions for both views to default (0, 0)"
          className="flex items-center gap-1 text-[9px] font-bold text-gray-400 hover:text-blue-500 transition-colors"
        >
          <RotateCcw size={10} />
          <span>Reset Pos</span>
        </button>
      </div>

      {/* Side View (2 numbers) */}
      <div className="mb-2 p-2 bg-slate-500/5 rounded border border-slate-500/10">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">
            Side View
          </span>
          <span className="text-[9px] opacity-60">X & Y Offset</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="block text-[9px] font-semibold opacity-70 mb-0.5">Side X (px)</span>
            <BufferedNumberInput
              step={1}
              value={sideLabelX}
              onChange={(val) => {
                setItems(prev => prev.map(i => i.id === selectedId ? setItemMiscParam(i, 'labelSideX', val) : i));
              }}
              className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
            />
          </div>
          <div>
            <span className="block text-[9px] font-semibold opacity-70 mb-0.5">Side Y (px)</span>
            <BufferedNumberInput
              step={1}
              value={sideLabelY}
              onChange={(val) => {
                setItems(prev => prev.map(i => i.id === selectedId ? setItemMiscParam(i, 'labelSideY', val) : i));
              }}
              className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
            />
          </div>
        </div>
      </div>

      {/* Top View (2 numbers) */}
      <div className="p-2 bg-slate-500/5 rounded border border-slate-500/10">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">
            Top View
          </span>
          <span className="text-[9px] opacity-60">X & Y Offset</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="block text-[9px] font-semibold opacity-70 mb-0.5">Top X (px)</span>
            <BufferedNumberInput
              step={1}
              value={topLabelX}
              onChange={(val) => {
                setItems(prev => prev.map(i => i.id === selectedId ? setItemMiscParam(i, 'labelTopX', val) : i));
              }}
              className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
            />
          </div>
          <div>
            <span className="block text-[9px] font-semibold opacity-70 mb-0.5">Top Y (px)</span>
            <BufferedNumberInput
              step={1}
              value={topLabelY}
              onChange={(val) => {
                setItems(prev => prev.map(i => i.id === selectedId ? setItemMiscParam(i, 'labelTopY', val) : i));
              }}
              className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
            />
          </div>
        </div>
      </div>

      <p className="text-[9px] opacity-60 mt-1.5 italic leading-tight">
        * 4 tracked values (2 for Side View, 2 for Top View) saved independently and exported to CSV/JSON.
      </p>
    </div>
  );
};
