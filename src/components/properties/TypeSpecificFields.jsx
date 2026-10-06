import { RotateCcw } from 'lucide-react';
import { TYPES, isDcmType, isMirrorType, isSplitterType } from '../../constants';
import { BufferedNumberInput } from '../BufferedNumberInput';

/** Settings that only apply to one component type (source, DCM, grating, splitter, mirror, detector, sample). */
export const TypeSpecificFields = ({ item: selectedItem, theme, updateItemProp, items }) => (
  <>
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
              <BufferedNumberInput
                value={selectedItem.periodLength ?? (selectedItem.sourceType === 'Wiggler' ? 100 : 50)}
                onChange={(val) => updateItemProp('periodLength', val)}
                className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1">Num Periods</label>
              <BufferedNumberInput
                step={1}
                value={selectedItem.numPeriods ?? (selectedItem.sourceType === 'Wiggler' ? 20 : 40)}
                onChange={(val) => updateItemProp('numPeriods', parseInt(val) || 1)}
                className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
              />
            </div>
          </div>
        )}
      </div>
    )}

    {/* 2. VDCM / HDCM SPECIFIC */}
    {isDcmType(selectedItem.type) && (
      <div className="space-y-2 pt-2 border-t border-slate-500/20">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold uppercase mb-1">Exit Offset (mm)</label>
            <BufferedNumberInput
              step={1}
              value={(() => {
                const val = selectedItem.exitOffset;
                if (val === undefined || val === null) return 25;
                const num = parseFloat(val);
                if (isNaN(num)) return 25;
                return num;
              })()}
              onChange={(val) => updateItemProp('exitOffset', val)}
              className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
              title="Beam exit offset in millimeters (shifts ray by offset / 100 grid units)"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase mb-1">Bragg Angle (°)</label>
            <BufferedNumberInput
              step={0.1}
              value={selectedItem.braggAngle !== undefined && selectedItem.braggAngle !== null ? selectedItem.braggAngle : 45}
              onChange={(val) => updateItemProp('braggAngle', val)}
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
                onClick={() => updateItemProp('crystal1Length', TYPES[selectedItem.type]?.defaultCrystal1Length || 0.5)}
                title="Reset Crystal 1 length to default"
                className="text-gray-400 hover:text-blue-500"
              >
                <RotateCcw size={10} />
              </button>
            </div>
            <BufferedNumberInput
              step={0.05}
              min={0.01}
              value={selectedItem.crystal1Length ?? TYPES[selectedItem.type]?.defaultCrystal1Length ?? 0.5}
              onChange={(val) => updateItemProp('crystal1Length', val)}
              className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-bold uppercase text-blue-500">Cryst 2 Len (m)</label>
              <button
                type="button"
                onClick={() => updateItemProp('crystal2Length', TYPES[selectedItem.type]?.defaultCrystal2Length || 0.5)}
                title="Reset Crystal 2 length to default"
                className="text-gray-400 hover:text-blue-500"
              >
                <RotateCcw size={10} />
              </button>
            </div>
            <BufferedNumberInput
              step={0.05}
              min={0.01}
              value={selectedItem.crystal2Length ?? TYPES[selectedItem.type]?.defaultCrystal2Length ?? 0.5}
              onChange={(val) => updateItemProp('crystal2Length', val)}
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
          <BufferedNumberInput
            step={0.1}
            value={selectedItem.diffractAngle ?? 15}
            onChange={(val) => updateItemProp('diffractAngle', val)}
            className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase mb-1">Fine Tilt Offset (°)</label>
          <BufferedNumberInput
            step={0.1}
            value={selectedItem.tiltAngle ?? 0}
            onChange={(val) => updateItemProp('tiltAngle', val)}
            className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
          />
        </div>
        <p className="col-span-2 text-[9px] opacity-60 italic leading-tight">
          * The grating automatically aligns to bisect the deflection path. Use offset for fine-tuning blaze angles.
        </p>
      </div>
    )}

    {/* 4. BEAM SPLITTER (VSPLIT / HSPLIT) SPECIFIC */}
    {isSplitterType(selectedItem.type) && (
      <div className="space-y-2 pt-2 border-t border-slate-500/20">
        {/* Splitting plane info */}
        <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-none">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
              Beam Splitter
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 rounded font-bold">
              {selectedItem.type === 'VSPLIT' ? 'V-Split (Side View)' : 'H-Split (Top View)'}
            </span>
          </div>
          <p className="text-[9px] opacity-70 leading-tight">
            Splits beam into a straight (passthrough) and a diffracted (amber) branch.
          </p>
        </div>

        {/* Tilt angle */}
        <div>
          <label className="block text-[10px] font-bold uppercase mb-1">Plate Tilt (°)</label>
          <BufferedNumberInput
            step={1}
            min={5}
            max={85}
            value={selectedItem.tiltAngle ?? 45}
            onChange={(val) => updateItemProp('tiltAngle', val)}
            className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
          />
          <p className="text-[9px] opacity-60 italic leading-tight mt-0.5">Visual rotation of the splitter plate on canvas (5–85°)</p>
        </div>

        {/* Diffract angle */}
        <div>
          <label className="block text-[10px] font-bold uppercase mb-1">Diffract Angle (°)</label>
          <BufferedNumberInput
            step={0.1}
            min={0.01}
            max={5}
            value={selectedItem.diffractAngle ?? 0.5}
            onChange={(val) => updateItemProp('diffractAngle', val)}
            className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
          />
          <p className="text-[9px] opacity-60 italic leading-tight mt-0.5">
            Angle of diffracted branch (overridden by downstream anchor). Computed: <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{(selectedItem.diffractAngleDeg ?? selectedItem.diffractAngle ?? 0.5).toFixed(3)}°</span>
          </p>
        </div>
      </div>
    )}

    {/* 4b. DOWNSTREAM BRANCH INDICATOR — for items downstream of a splitter */}
    {!['VSPLIT', 'HSPLIT', 'WALL', 'HUTCH', 'CHAMBER', 'SOURCE'].includes(selectedItem.type) && (() => {
      const hasSplitterUpstream = (items || []).some(it => 
        (it.type === 'VSPLIT' || it.type === 'HSPLIT') && 
        (it.distance || 0) < (selectedItem.distance || 0)
      );
      if (!hasSplitterUpstream) return null;
      const branch = selectedItem.branch || 'straight';
      return (
        <div className="pt-2 border-t border-slate-500/20">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold uppercase">Ray Branch</label>
            <span className="text-[9px] opacity-60">after beam splitter</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => updateItemProp('branch', 'straight')}
              className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors ${branch === 'straight' ? 'bg-blue-600 text-white' : `border ${theme.buttonBg} ${theme.text} opacity-60 hover:opacity-100`}`}
            >
              → Straight Branch
            </button>
            <button
              type="button"
              onClick={() => updateItemProp('branch', 'diffracted')}
              className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors ${branch === 'diffracted' ? 'bg-amber-500 text-white' : `border ${theme.buttonBg} ${theme.text} opacity-60 hover:opacity-100`}`}
            >
              ⬡ Diffracted Branch
            </button>
          </div>
          <p className="text-[9px] opacity-60 italic leading-tight mt-1">Select whether this component or anchor steers the main straight beamline or the diffracted branch.</p>
        </div>
      );
    })()}

    {/* 5. MIRRORS (VFM / HFM) SPECIFIC */}
    {isMirrorType(selectedItem.type) && (() => {
      const grazingMrad = selectedItem.grazingAngleMrad !== undefined
        ? Number(selectedItem.grazingAngleMrad)
        : (selectedItem.grazingAngle !== undefined ? Number(selectedItem.grazingAngle) : 0);
      const deflectMrad = selectedItem.deflectAngleMrad !== undefined
        ? Number(selectedItem.deflectAngleMrad)
        : (grazingMrad * 2);

      return (
        <div className="space-y-2 pt-2 border-t border-slate-500/20">
          {/* MIRROR ANGLE READOUT (in mrad) */}
          <div className="p-2.5 bg-sky-500/10 border border-sky-500/30 rounded-none space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-sky-700 dark:text-sky-300">
                Mirror Angles
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 bg-sky-500/20 text-sky-700 dark:text-sky-200 rounded font-bold">
                mrad
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div>
                <span className="block text-[9px] uppercase font-bold text-sky-800 dark:text-sky-200 opacity-75">
                  Grazing (θ)
                </span>
                <span className="text-sm font-black font-mono text-sky-700 dark:text-sky-300">
                  {grazingMrad.toFixed(2)} mrad
                </span>
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-sky-800 dark:text-sky-200 opacity-75">
                  Deflection (2θ)
                </span>
                <span className="text-sm font-black font-mono text-sky-700 dark:text-sky-300">
                  {deflectMrad.toFixed(2)} mrad
                </span>
              </div>
            </div>
            <p className="text-[9px] opacity-70 italic leading-tight pt-0.5">
              * Calculated from ray deflection towards downstream anchor / detector.
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase mb-1">Focal Length (m)</label>
            <BufferedNumberInput
              step={0.1}
              value={selectedItem.focalLength ?? ''}
              placeholder="e.g. 5.0"
              onChange={(val) => updateItemProp('focalLength', val)}
              className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
            />
          </div>

          {/* MIRROR THICKNESS & FACE HEIGHT */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-500/20">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold uppercase text-blue-500">Thickness (m)</label>
                <button
                  type="button"
                  onClick={() => {
                    updateItemProp('substrateThickness', 0.3);
                    updateItemProp('miscD', 0.3);
                  }}
                  title="Reset substrate thickness to default (0.30 m)"
                  className="text-gray-400 hover:text-blue-500"
                >
                  <RotateCcw size={10} />
                </button>
              </div>
              <BufferedNumberInput
                step={0.05}
                min={0.05}
                value={selectedItem.substrateThickness ?? 0.3}
                onChange={(val) => {
                  const num = parseFloat(val);
                  const v = !isNaN(num) && num > 0 ? num : 0.3;
                  updateItemProp('substrateThickness', v);
                  updateItemProp('miscD', v);
                }}
                className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
                title="Substrate thickness (active deflection view: Side for VFM, Top for HFM)"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold uppercase text-blue-500">Face Height (m)</label>
                <button
                  type="button"
                  onClick={() => updateItemProp('faceHeight', 1.0)}
                  title="Reset face height to default (1.00 m)"
                  className="text-gray-400 hover:text-blue-500"
                >
                  <RotateCcw size={10} />
                </button>
              </div>
              <BufferedNumberInput
                step={0.1}
                min={0.1}
                value={selectedItem.faceHeight ?? 1.0}
                onChange={(val) => {
                  const num = parseFloat(val);
                  const v = !isNaN(num) && num > 0 ? num : 1.0;
                  updateItemProp('faceHeight', v);
                }}
                className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none font-mono ${theme.buttonBg} ${theme.text}`}
                title="Optic face height / transverse aperture in inactive view (Side for HFM, Top for VFM)"
              />
            </div>
          </div>
          <p className="text-[9px] opacity-60 italic leading-tight">
            * Thickness controls substrate thickness in deflecting plane. Face Height controls mirror body in pass-through plane.
          </p>
        </div>
      );
    })()}

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
  </>
);
