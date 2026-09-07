import templatesData from '../../templates.json' with { type: 'json' };

export const templates = templatesData;

export const TYPES = {
  SOURCE: { id: 'SOURCE', name: 'Source', width: 40, height: 24, defaultLength: 2 },
  SLIT: { id: 'SLIT', name: 'Slit', width: 6, height: 20 },
  FILTER: { id: 'FILTER', name: 'Filter', width: 12, height: 20 },
  GRATING: { id: 'GRATING', name: 'Grating', width: 20, height: 8, defaultLength: 1 },
  WALL: { id: 'WALL', name: 'Wall', width: 24, height: 140 },
  XBPM: { id: 'XBPM', name: 'XBPM', width: 8.5, height: 8.5, defaultLength: 0.425 },
  CHAMBER: { id: 'CHAMBER', name: 'Floating Chamber', width: 80, height: 60 },
  HUTCH: { id: 'HUTCH', name: 'Hutch', width: 340, height: 140 },
  VDCM: { id: 'VDCM', name: 'VDCM', width: 160, height: 60, defaultCrystal1Length: 1.0, defaultCrystal2Length: 1.0 },
  HDCM: { id: 'HDCM', name: 'HDCM', width: 160, height: 60, defaultCrystal1Length: 1.0, defaultCrystal2Length: 1.0 },
  VFM: { id: 'VFM', name: 'VFM', width: 40, height: 6, defaultLength: 2 },
  HFM: { id: 'HFM', name: 'HFM', width: 40, height: 6, defaultLength: 2 },
  SAMPLE: { id: 'SAMPLE', name: 'Sample', width: 12, height: 12, defaultLength: 0.6 },
  SCREEN: { id: 'SCREEN', name: 'Screen', width: 12, height: 20 },
  DETECTOR: { id: 'DETECTOR', name: 'Detector', width: 21, height: 28, defaultLength: 1.05 }
};

export const ORIGIN_X = 160; 
export const PX_PER_M = 20;
export const SNAP_STEP_M = 0.1;          // snap resolution in metres
export const SNAP_STEP_PX = SNAP_STEP_M * PX_PER_M;  // = 2px
export const PRESET_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#64748b', '#0f172a'];
export const GRID_SIZE = 20;
