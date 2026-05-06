import templatesData from '../../templates.json';

export const templates = templatesData;

export const TYPES = {
  SOURCE: { id: 'SOURCE', name: 'Source', width: 80, height: 24, defaultLength: 4 },
  SLIT: { id: 'SLIT', name: 'Slit', width: 6, height: 40 },
  FILTER: { id: 'FILTER', name: 'Filter', width: 12, height: 40 },
  GRATING: { id: 'GRATING', name: 'Grating', width: 40, height: 16, defaultLength: 2 },
  WALL: { id: 'WALL', name: 'Wall', width: 24, height: 140 },
  XBPM: { id: 'XBPM', name: 'XBPM', width: 24, height: 24, defaultLength: 1.2 },
  HUTCH: { id: 'HUTCH', name: 'Hutch', width: 340, height: 140 },
  VDCM: { id: 'VDCM', name: 'VDCM', width: 160, height: 60, defaultCrystal1Length: 1.0, defaultCrystal2Length: 1.0 },
  HDCM: { id: 'HDCM', name: 'HDCM', width: 160, height: 60, defaultCrystal1Length: 1.0, defaultCrystal2Length: 1.0 },
  VFM: { id: 'VFM', name: 'VFM', width: 80, height: 12, defaultLength: 4 },
  HFM: { id: 'HFM', name: 'HFM', width: 80, height: 12, defaultLength: 4 },
  SAMPLE: { id: 'SAMPLE', name: 'Sample', width: 24, height: 24, defaultLength: 1.2 },
  SCREEN: { id: 'SCREEN', name: 'Screen', width: 6, height: 40 },
  DETECTOR: { id: 'DETECTOR', name: 'Detector', width: 30, height: 40, defaultLength: 1.5 }
};

export const ORIGIN_X = 160; 
export const PX_PER_M = 20;
export const PRESET_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#64748b', '#0f172a'];
export const GRID_SIZE = 20;
