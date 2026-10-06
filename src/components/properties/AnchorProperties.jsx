import { RotateCcw, Trash2 } from 'lucide-react';
import { ORIGIN_X, PX_PER_M, PX_PER_MM_V, BEAM_AXIS_PX } from '../../constants';
import { BufferedNumberInput } from '../BufferedNumberInput';
import { LockControl } from './LockControl';

/** Properties for zero-length steering anchors (side, top and virtual). */
export const AnchorProperties = ({ item: selectedItem, theme, updateItemProp, deleteSelected }) => (
  <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
    <LockControl
      item={selectedItem}
      theme={theme}
      onToggle={() => updateItemProp('isLocked', !selectedItem.isLocked)}
      lockedLabel="Anchor: Locked"
      unlockedLabel="Anchor: Unlocked"
      lockedHint="Movement locked"
      unlockedHint="Move via drag or arrow keys"
      lockText="Lock"
    />

    {/* Spatial Coordinates: Pos X + Height Y (for Side) OR Pos X + Offset Z (for Top) */}
    <div className="p-3 border rounded-none bg-slate-500/5 border-slate-500/20 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Spatial Coordinates
        </span>
        <button
          type="button"
          onClick={() => {
            updateItemProp('distance', 0);
            updateItemProp('start', 0);
            updateItemProp('end', 0);
            updateItemProp('x', ORIGIN_X);
          }}
          title="Reset X position to 0m"
          className="flex items-center gap-1 text-[9px] font-bold text-gray-400 hover:text-blue-500 transition-colors"
        >
          <RotateCcw size={10} />
          <span>Reset X (0m)</span>
        </button>
      </div>

      {/* Position X (m) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-[10px] font-bold uppercase">
            Position X (m)
          </label>
          <span className="text-[9px] opacity-50 font-mono">← / → keys</span>
        </div>
        <BufferedNumberInput
          step={0.1}
          value={selectedItem.distance ?? 0}
          onChange={(val) => {
            const num = parseFloat(val) || 0;
            updateItemProp('distance', num);
            updateItemProp('start', num);
            updateItemProp('end', num);
            updateItemProp('x', ORIGIN_X + num * PX_PER_M);
          }}
          className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
          title="Beamline longitudinal coordinate X in meters (move with ← / → keys)"
        />
      </div>

      {/* Side Anchor: ONLY Height Y (Elevation in mm) */}
      {(selectedItem.type === 'ANCHOR_SIDE' || selectedItem.type === 'ANCHOR') && (
        <div className="pt-2 border-t border-slate-500/20">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[10px] font-bold uppercase text-sky-600 dark:text-sky-400">
              Elevation Height Y (mm)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[9px] opacity-50 font-mono">↑ / ↓ keys</span>
              <button
                type="button"
                onClick={() => {
                  updateItemProp('height', 0);
                  updateItemProp('y', BEAM_AXIS_PX);
                }}
                title="Reset height to 0 mm"
                className="text-gray-400 hover:text-sky-500"
              >
                <RotateCcw size={10} />
              </button>
            </div>
          </div>
          <BufferedNumberInput
            step={0.1}
            value={(() => {
              if (selectedItem.height === undefined || selectedItem.height === null) return 0;
              return Math.round(Number(selectedItem.height) * 10) / 10;
            })()}
            onChange={(val) => {
              const num = parseFloat(val) || 0;
              updateItemProp('height', num);
              updateItemProp('y', BEAM_AXIS_PX - num * PX_PER_MM_V);
            }}
            className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
            title="Vertical elevation Y in millimeters in Side View (move with ↑ / ↓ keys)"
          />
        </div>
      )}

      {/* Top Anchor: ONLY Lateral Offset Z (mm) */}
      {(selectedItem.type === 'ANCHOR_TOP' || selectedItem.type === 'ANCHOR') && (
        <div className="pt-2 border-t border-slate-500/20">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400">
              Lateral Offset Z (mm)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[9px] opacity-50 font-mono">↑ / ↓ keys</span>
              <button
                type="button"
                onClick={() => {
                  updateItemProp('offset', 0);
                  updateItemProp('z', BEAM_AXIS_PX);
                }}
                title="Reset offset to 0 mm"
                className="text-gray-400 hover:text-purple-500"
              >
                <RotateCcw size={10} />
              </button>
            </div>
          </div>
          <BufferedNumberInput
            step={0.1}
            value={(() => {
              if (selectedItem.offset === undefined || selectedItem.offset === null) return 0;
              return Math.round(Number(selectedItem.offset) * 10) / 10;
            })()}
            onChange={(val) => {
              const num = parseFloat(val) || 0;
              updateItemProp('offset', num);
              updateItemProp('z', BEAM_AXIS_PX + num * PX_PER_MM_V);
            }}
            className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
            title="Lateral offset Z in millimeters in Top View (move with ↑ / ↓ keys)"
          />
        </div>
      )}
    </div>

    {/* Description Callout */}
    <div className="p-3 border rounded-none bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300 space-y-1 text-xs">
      <div className="font-bold flex items-center gap-1.5">
        <span>🎯</span>
        <span>
          {selectedItem.type === 'ANCHOR_SIDE' 
            ? 'Side Anchor (Elevation Steering)' 
            : (selectedItem.type === 'ANCHOR_TOP' ? 'Top Anchor (Lateral Steering)' : 'Virtual Anchor')}
        </span>
      </div>
      <p className="text-[11px] opacity-85 leading-relaxed">
        {selectedItem.type === 'ANCHOR_SIDE' 
          ? 'Active in Side View only. Upstream vertical benders deflect toward this anchor.' 
          : (selectedItem.type === 'ANCHOR_TOP' 
            ? 'Active in Top View only. Upstream horizontal benders deflect toward this anchor.' 
            : 'Zero-length waypoint for ray steering with light passthrough.')}
      </p>
      <p className="text-[10px] opacity-75 leading-relaxed">
        Move freely using arrow keys (←/→ for Pos X, ↑/↓ for {selectedItem.type === 'ANCHOR_TOP' ? 'Offset Z' : 'Height Y'}) or mouse drag.
      </p>
    </div>

    <button onClick={deleteSelected} className="w-full flex items-center justify-center gap-2 p-2 mt-auto bg-red-500 hover:bg-red-600 border border-red-700 text-white rounded-none transition-colors shadow-sm">
      <Trash2 size={14} />
      <span className="text-xs font-bold">Delete Anchor</span>
    </button>
  </div>
);
