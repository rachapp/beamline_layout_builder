import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseCsvToItems, generateCsvContent } from '../csv.js';
import { computeConstructionSchedule } from '../schedule.js';
import { getItemBoundsM } from '../geometry.js';
import { csvTemplates } from '../../constants/templates.js';
import { TYPES } from '../../constants/index.js';

const templatesDir = path.resolve(__dirname, '../../../templates');
const templateFiles = fs.readdirSync(templatesDir).filter(f => f.endsWith('.csv'));

const roundTrip = (items, canvasLength = 60) =>
  parseCsvToItems(generateCsvContent(computeConstructionSchedule(items, canvasLength)));

// Fields that must survive Export CSV -> Import CSV unchanged.
const snapshot = (item) => {
  const b = getItemBoundsM(item);
  return {
    type: item.type,
    name: item.customName,
    dist: b.dist,
    start: b.start,
    end: b.end,
    physLen: b.physLen,
    isLocked: Boolean(item.isLocked),
    showLabel: item.showLabel !== false,
    showFootprint: Boolean(item.showFootprint),
    branch: item.branch || null,
    labelOffsets: item.labelOffsets || null
  };
};

describe('CSV templates', () => {
  it('finds the template files', () => {
    expect(templateFiles.length).toBeGreaterThan(0);
  });

  it.each(templateFiles)('%s parses into valid components', (file) => {
    const items = parseCsvToItems(fs.readFileSync(path.join(templatesDir, file), 'utf8'));
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(TYPES[item.type], `unknown type ${item.type}`).toBeDefined();
      for (const key of ['x', 'y', 'z', 'distance', 'start', 'end']) {
        expect(Number.isFinite(item[key]), `${item.customName}.${key} = ${item[key]}`).toBe(true);
      }
    }
    expect(new Set(items.map(i => i.id)).size).toBe(items.length);
  });

  it.each(templateFiles)('%s survives an export/import round trip', (file) => {
    const original = parseCsvToItems(fs.readFileSync(path.join(templatesDir, file), 'utf8'));
    const reimported = roundTrip(original);
    const byName = (list) => [...list].map(snapshot).sort((a, b) => a.dist - b.dist || a.name.localeCompare(b.name));
    expect(byName(reimported)).toEqual(byName(original));
  });

  it('parses the bundled fallback template', () => {
    const items = parseCsvToItems(Object.values(csvTemplates)[0].rawCsv);
    expect(items.map(i => i.type)).toEqual(['SOURCE', 'SLIT', 'VDCM', 'VFM', 'DETECTOR']);
  });
});

describe('parseCsvToItems', () => {
  it('returns no items for empty or non-CSV input', () => {
    expect(parseCsvToItems('')).toEqual([]);
    expect(parseCsvToItems(null)).toEqual([]);
    expect(parseCsvToItems('# only a comment')).toEqual([]);
  });

  it('reads quoted names containing commas and quotes', () => {
    const csv = [
      'Component Name,Type,Center Position X (m)',
      '"Slit, ""main""",SLIT,5'
    ].join('\n');
    const [item] = parseCsvToItems(csv);
    expect(item.customName).toBe('Slit, "main"');
    expect(item.distance).toBe(5);
  });

  it('falls back to SLIT for an unknown type', () => {
    const [item] = parseCsvToItems('Component Name,Type,Center Position X (m)\nThing,NOT_A_TYPE,3');
    expect(item.type).toBe('SLIT');
  });

  it('keeps elevation in mm when the header says mm', () => {
    const [item] = parseCsvToItems('Component Name,Type,Center Position X (m),Elevation Y (mm)\nDet,DETECTOR,10,30');
    expect(item.height).toBe(30);
  });
});
