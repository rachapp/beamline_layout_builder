import { csvTemplates } from './templates.js';

export const templates = csvTemplates;
export { csvTemplates };

export const TYPES = {
  SOURCE: { id: 'SOURCE', name: 'Source', width: 40, height: 24, defaultLength: 2 },
  SLIT: { id: 'SLIT', name: 'Slit', width: 6, height: 20, defaultLength: 0.3 },
  FILTER: { id: 'FILTER', name: 'Filter', width: 12, height: 20, defaultLength: 0.4 },
  GRATING: { id: 'GRATING', name: 'Grating', width: 20, height: 8, defaultLength: 1 },
  WALL: { id: 'WALL', name: 'Wall', width: 24, height: 140, defaultLength: 1.2 },
  XBPM: { id: 'XBPM', name: 'XBPM', width: 8.5, height: 8.5, defaultLength: 0.425 },
  CHAMBER: { id: 'CHAMBER', name: 'Floating Chamber', width: 80, height: 60, defaultLength: 4 },
  HUTCH: { id: 'HUTCH', name: 'Hutch', width: 340, height: 140, defaultLength: 17 },
  VDCM: { id: 'VDCM', name: 'VDCM', width: 24, height: 40, defaultLength: 1.2, defaultCrystal1Length: 0.5, defaultCrystal2Length: 0.5 },
  HDCM: { id: 'HDCM', name: 'HDCM', width: 24, height: 40, defaultLength: 1.2, defaultCrystal1Length: 0.5, defaultCrystal2Length: 0.5 },
  VFM: { id: 'VFM', name: 'VFM', width: 40, height: 6, defaultLength: 2, defaultThickness: 0.3, defaultFaceHeight: 1.0 },
  HFM: { id: 'HFM', name: 'HFM', width: 40, height: 6, defaultLength: 2, defaultThickness: 0.3, defaultFaceHeight: 1.0 },
  VSPLIT: { id: 'VSPLIT', name: 'V-Split', width: 12, height: 12, defaultLength: 0.6, defaultTiltAngle: 45, defaultDiffractAngle: 0.5 },
  HSPLIT: { id: 'HSPLIT', name: 'H-Split', width: 12, height: 12, defaultLength: 0.6, defaultTiltAngle: 45, defaultDiffractAngle: 0.5 },
  SAMPLE: { id: 'SAMPLE', name: 'Sample', width: 12, height: 12, defaultLength: 0.6 },
  SCREEN: { id: 'SCREEN', name: 'Screen', width: 12, height: 20, defaultLength: 0.6 },
  DETECTOR: { id: 'DETECTOR', name: 'Detector', width: 21, height: 28, defaultLength: 1.05 },
  ANCHOR_SIDE: { id: 'ANCHOR_SIDE', name: 'Side Anchor', width: 8, height: 8, defaultLength: 0 },
  ANCHOR_TOP: { id: 'ANCHOR_TOP', name: 'Top Anchor', width: 8, height: 8, defaultLength: 0 },
  ANCHOR: { id: 'ANCHOR', name: 'Virtual Anchor', width: 8, height: 8, defaultLength: 0 }
};

// Component type groups. Use these helpers instead of repeating type lists inline.
const RANGE_TYPES = ['WALL', 'HUTCH', 'CHAMBER'];
const WALL_TYPES = ['WALL', 'HUTCH'];
const ANCHOR_TYPES = ['ANCHOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'];
const DCM_TYPES = ['VDCM', 'HDCM'];
const MIRROR_TYPES = ['VFM', 'HFM'];
const SPLITTER_TYPES = ['VSPLIT', 'HSPLIT'];
const ELEVATION_EDITABLE_TYPES = ['SOURCE', 'DETECTOR', 'ANCHOR', 'ANCHOR_SIDE'];
const OFFSET_EDITABLE_TYPES = ['SOURCE', 'DETECTOR', 'ANCHOR', 'ANCHOR_TOP'];

/** Walls, hutches and floating chambers: items defined by a start/end span rather than an optic body. */
export const isRangeType = (type) => RANGE_TYPES.includes(type);
/** Walls and hutches: floor-standing construction. */
export const isWallType = (type) => WALL_TYPES.includes(type);
export const isAnchorType = (type) => ANCHOR_TYPES.includes(type);
export const isDcmType = (type) => DCM_TYPES.includes(type);
export const isMirrorType = (type) => MIRROR_TYPES.includes(type);
export const isSplitterType = (type) => SPLITTER_TYPES.includes(type);
/** Types whose elevation (height Y) is set by the user rather than by the ray trace. */
export const canEditElevation = (type) => ELEVATION_EDITABLE_TYPES.includes(type);
/** Types whose lateral offset (Z) is set by the user rather than by the ray trace. */
export const canEditOffset = (type) => OFFSET_EDITABLE_TYPES.includes(type);
/** Types whose elevation or offset (or both) is set by the user. */
export const hasManualPosition = (type) => canEditElevation(type) || canEditOffset(type);

/** True for zero-length steering points: anchor types and detectors flagged as virtual/invisible. */
export const isVirtualAnchor = (item) =>
  Boolean(item) && (isAnchorType(item.type) || item.detectorType === 'Virtual Anchor' || Boolean(item.isInvisible));

export const ORIGIN_X = 160;
export const PX_PER_M = 20;              // Horizontal scale (X): 20 px/m (1 grid unit = 1.0 m)
export const PX_PER_MM_V = 0.4;          // Vertical scale (Y/Z): 0.4 px/mm (1 grid unit = 20 px = 50 mm)
export const PX_PER_M_V = 400;           // Vertical scale (Y/Z): 400 px/m
export const SNAP_STEP_M = 0.1;          // snap resolution in metres
export const SNAP_STEP_PX = SNAP_STEP_M * PX_PER_M;  // = 2px
export const BEAM_AXIS_PX = 150;         // canvas Y/Z coordinate of the nominal beam axis (0 mm)
export const FLOOR_PX = 200;             // canvas Y coordinate of the floor line in SIDE view
export const FOCUS_DELAY_MS = 40;        // delay before zooming to a clicked item, so a drag can cancel it
export const PRESET_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#64748b', '#0f172a'];
export const GRID_SIZE = 20;

/** Canvas Y (SIDE view) for an elevation in mm above the beam axis. */
export const elevationMmToPx = (mm) => BEAM_AXIS_PX - mm * PX_PER_MM_V;
/** Canvas Z (TOP view) for a lateral offset in mm from the beam axis. */
export const offsetMmToPx = (mm) => BEAM_AXIS_PX + mm * PX_PER_MM_V;
/** Beamline distance in m to canvas X. */
export const distanceToPx = (m) => ORIGIN_X + m * PX_PER_M;
