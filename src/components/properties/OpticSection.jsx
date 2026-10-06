import { RotateCcw } from 'lucide-react';
import { TYPES, PX_PER_MM_V, BEAM_AXIS_PX } from '../../constants';
import { getItemBoundsM } from '../../utils/constructionUtils';
import { BufferedNumberInput } from '../BufferedNumberInput';
import { LockControl } from './LockControl';

import { TypeSpecificFields } from './TypeSpecificFields';
import { LabelTrackingFields } from './LabelTrackingFields';

/** Position, length, height and offset of an optic, plus its type-specific settings. */
export const OpticSection = (props) => {
  const { item: selectedItem, theme, updateItemProp } = props;
  return (
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

    <LockControl
      item={selectedItem}
      theme={theme}
      onToggle={() => updateItemProp('isLocked', !selectedItem.isLocked)}
      lockedLabel="Optics Movement: Locked"
      unlockedLabel="Optics Movement: Unlocked"
    />

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
              <BufferedNumberInput
                step={0.05}
                value={getItemBoundsM(selectedItem).dist}
                onChange={(val) => updateItemProp('distance', val)}
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
                      const defaultLen = selectedItem.detectorType === 'Virtual Anchor' ? 0 : (TYPES[selectedItem.type]?.defaultLength ?? 1.0);
                      updateItemProp('physicalLength', defaultLen);
                      updateItemProp('length', defaultLen);
                    }}
                    title={`Reset physical length to default (${selectedItem.detectorType === 'Virtual Anchor' ? '0' : (TYPES[selectedItem.type]?.defaultLength ?? 1.0)}m)`}
                    className="text-gray-400 hover:text-emerald-600 transition-colors"
                  >
                    <RotateCcw size={10} />
                  </button>
                </div>
                <BufferedNumberInput
                  step={0.05}
                  min={selectedItem.detectorType === 'Virtual Anchor' ? 0 : 0.01}
                  value={selectedItem.physicalLength ?? selectedItem.length ?? (selectedItem.detectorType === 'Virtual Anchor' ? 0 : (TYPES[selectedItem.type]?.defaultLength || 1.0))}
                  onChange={(val) => {
                    updateItemProp('physicalLength', val);
                    updateItemProp('length', val);
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

    {/* Height Y and Offset Z (displayed in mm, 1 unit grid = 20px = 50mm) */}
    {(() => {
      const isElevationEditable = ['SOURCE', 'DETECTOR'].includes(selectedItem.type);
      const isDetectorInPath = selectedItem.type === 'DETECTOR' && selectedItem.stayInPath !== false;
      
      const displayHeightMm = (isElevationEditable && !isDetectorInPath)
        ? (selectedItem.height !== undefined 
            ? Math.round(Number(selectedItem.height) * 10) / 10
            : 0)
        : (selectedItem.y !== undefined ? Math.round(((BEAM_AXIS_PX - selectedItem.y) / PX_PER_MM_V) * 10) / 10 : 0);

      const displayOffsetMm = (isElevationEditable && !isDetectorInPath)
        ? (selectedItem.offset !== undefined 
            ? Math.round(Number(selectedItem.offset) * 10) / 10
            : 0)
        : (selectedItem.z !== undefined ? Math.round((((selectedItem.z) - BEAM_AXIS_PX) / PX_PER_MM_V) * 10) / 10 : 0);

      return (
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-500/20">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={`block text-[10px] font-bold uppercase ${!isElevationEditable ? 'opacity-60' : ''}`}>
                Height Y (mm)
              </label>
              {isElevationEditable && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedItem.type === 'DETECTOR') {
                      updateItemProp('stayInPath', true);
                    } else {
                      updateItemProp('height', 0);
                      updateItemProp('y', BEAM_AXIS_PX);
                    }
                  }}
                  title={selectedItem.type === 'DETECTOR' ? "Snap back to beam path" : "Reset height to 0 mm"}
                  className="text-gray-400 hover:text-blue-500"
                >
                  <RotateCcw size={10} />
                </button>
              )}
            </div>
            <BufferedNumberInput
              step={0.1}
              value={displayHeightMm}
              disabled={!isElevationEditable}
              onChange={(val) => {
                const num = parseFloat(val) || 0;
                updateItemProp('height', num);
                updateItemProp('y', BEAM_AXIS_PX - num * PX_PER_MM_V);
                if (selectedItem.type === 'DETECTOR') updateItemProp('stayInPath', false);
              }}
              className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${
                !isElevationEditable 
                  ? 'opacity-60 cursor-not-allowed bg-gray-200/50 dark:bg-slate-800/60 text-gray-500 border-gray-300 dark:border-slate-700' 
                  : `${theme.buttonBg} ${theme.text}`
              }`}
              title={!isElevationEditable ? "Auto-calculated from beam ray trace (editable on Source & Detector only)" : "Elevation Height Y (mm)"}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={`block text-[10px] font-bold uppercase ${!isElevationEditable ? 'opacity-60' : ''}`}>
                Offset Z (mm)
              </label>
              {isElevationEditable && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedItem.type === 'DETECTOR') {
                      updateItemProp('stayInPath', true);
                    } else {
                      updateItemProp('offset', 0);
                      updateItemProp('z', BEAM_AXIS_PX);
                    }
                  }}
                  title={selectedItem.type === 'DETECTOR' ? "Snap back to beam path" : "Reset offset to 0 mm"}
                  className="text-gray-400 hover:text-blue-500"
                >
                  <RotateCcw size={10} />
                </button>
              )}
            </div>
            <BufferedNumberInput
              step={0.1}
              value={displayOffsetMm}
              disabled={!isElevationEditable}
              onChange={(val) => {
                const num = parseFloat(val) || 0;
                updateItemProp('offset', num);
                updateItemProp('z', BEAM_AXIS_PX + num * PX_PER_MM_V);
                if (selectedItem.type === 'DETECTOR') updateItemProp('stayInPath', false);
              }}
              className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${
                !isElevationEditable 
                  ? 'opacity-60 cursor-not-allowed bg-gray-200/50 dark:bg-slate-800/60 text-gray-500 border-gray-300 dark:border-slate-700' 
                  : `${theme.buttonBg} ${theme.text}`
              }`}
              title={!isElevationEditable ? "Auto-calculated from beam ray trace (editable on Source & Detector only)" : "Lateral Offset Z (mm)"}
            />
          </div>
          {!isElevationEditable && (
            <p className="col-span-2 text-[9px] opacity-60 italic leading-tight mt-0.5">
              * Height & Offset auto-calculated from beam path. Editable on Source & Detector only.
            </p>
          )}
        </div>
      );
    })()}

    <TypeSpecificFields {...props} />

    <LabelTrackingFields {...props} />
  </div>
  );
};
