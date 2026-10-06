import { PX_PER_M, PX_PER_MM_V, ORIGIN_X, BEAM_AXIS_PX, FLOOR_PX, hasManualPosition, isAnchorType, isWallType, isDcmType } from '../../constants';
import { calculateUpdatedBounds } from '../../utils/constructionUtils';

/**
 * Editing of the selected item's properties from the Properties panel, and deleting the selection.
 */
export const useItemEditing = ({ setItems, selectedId, selection, computedItemsRef }) => {
  const deleteSelected = () => {
    const ids = selection.ids.length > 0 ? selection.ids : (selectedId != null ? [selectedId] : []);
    if (ids.length === 0) return;
    setItems(prev => prev.filter(i => !ids.includes(i.id)));
    selection.select(null);
  };

  const updateItemProp = (propName, val) => {
    if (selectedId) {
      setItems(prevItems => prevItems.map(i => {
        if (i.id === selectedId) {
          const updated = { ...i, [propName]: val };

          if (i.type === 'SOURCE') {
            if (['start', 'end', 'distance'].includes(propName)) {
              const constraint = i.lockLength ? 'LOCK_LENGTH' : (i.lockCenter ? 'LOCK_CENTER' : 'ADJUST_LENGTH');
              return calculateUpdatedBounds(i, propName, val, constraint);
            } else if (propName === 'length' && !isNaN(val) && val !== '') {
              return calculateUpdatedBounds(i, 'length', val);
            } else if (propName === 'numPeriods' && !isNaN(val) && val !== '') {
              const n = Math.max(1, parseInt(val));
              const pLen = updated.periodLength || (updated.sourceType === 'Wiggler' ? 100 : 50);
              updated.numPeriods = n;
              updated.length = parseFloat(((n * pLen) / 1000).toFixed(3));
              updated.dimX = updated.length * PX_PER_M;
              updated.end = i.end !== undefined ? i.end : (i.distance ?? 0);
              updated.start = parseFloat((updated.end - updated.length).toFixed(3));
              updated.distance = updated.end;
              updated.x = ORIGIN_X + updated.end * PX_PER_M;
            } else if (propName === 'periodLength' && !isNaN(val) && val !== '') {
              const pLen = Math.max(1, parseFloat(val));
              const n = updated.numPeriods || (updated.sourceType === 'Wiggler' ? 20 : 40);
              updated.periodLength = pLen;
              updated.length = parseFloat(((n * pLen) / 1000).toFixed(3));
              updated.dimX = updated.length * PX_PER_M;
              updated.end = i.end !== undefined ? i.end : (i.distance ?? 0);
              updated.start = parseFloat((updated.end - updated.length).toFixed(3));
              updated.distance = updated.end;
              updated.x = ORIGIN_X + updated.end * PX_PER_M;
            } else if (propName === 'sourceType') {
              if (val === 'Bending Magnet') {
                updated.dimX = 30;
                updated.length = 1.5;
              } else {
                const pLen = val === 'Wiggler' ? 100 : 50;
                const n = val === 'Wiggler' ? 20 : 40;
                updated.periodLength = pLen;
                updated.numPeriods = n;
                updated.length = parseFloat(((pLen * n) / 1000).toFixed(3));
                updated.dimX = updated.length * PX_PER_M;
              }
              updated.end = i.end !== undefined ? i.end : (i.distance ?? 0);
              updated.start = parseFloat((updated.end - updated.length).toFixed(3));
              updated.distance = updated.end;
              updated.x = ORIGIN_X + updated.end * PX_PER_M;
            }
          } else if (['start', 'end', 'chamberLength', 'footprintLength'].includes(propName)) {
            const constraint = i.lockLength ? 'LOCK_LENGTH' : (i.lockCenter ? 'LOCK_CENTER' : 'ADJUST_LENGTH');
            return calculateUpdatedBounds(i, propName, val, constraint);
          } else if (['physicalLength', 'opticLength'].includes(propName)) {
            return calculateUpdatedBounds(i, 'physicalLength', val);
          } else if (propName === 'stayInPath') {
            updated.stayInPath = Boolean(val);
            if (val === true) {
              const comp = computedItemsRef.current?.find(c => c.id === i.id);
              if (comp) {
                updated.y = comp.y;
                updated.z = comp.z;
                updated.height = parseFloat(((BEAM_AXIS_PX - comp.y) / PX_PER_MM_V).toFixed(1));
                updated.offset = parseFloat(((comp.z - BEAM_AXIS_PX) / PX_PER_MM_V).toFixed(1));
              }
            }
          } else if (propName === 'freeDownstream') {
            updated.freeDownstream = Boolean(val);
          } else if (propName === 'showFootprint') {
            updated.showFootprint = Boolean(val);
          } else if (propName === 'showFootprintText') {
            updated.showFootprintText = Boolean(val);
          } else if (propName === 'isLocked') {
            updated.isLocked = Boolean(val);
          } else if (propName === 'lockLength') {
            updated.lockLength = Boolean(val);
            if (val) updated.lockCenter = false;
          } else if (propName === 'lockCenter') {
            updated.lockCenter = Boolean(val);
            if (val) updated.lockLength = false;
          } else if (propName === 'length' && !isNaN(val) && val !== '') {
            return calculateUpdatedBounds(i, 'physicalLength', val);
          } else if (propName === 'distance' && !isNaN(val) && val !== '') {
            return calculateUpdatedBounds(i, 'distance', val);
          } else if (isDcmType(i.type)) {
            if (propName === 'housingLength' || propName === 'chamberLength') {
              if (val === undefined || val === '') {
                delete updated.housingLength;
                const chLen = 1.5;
                updated.chamberLength = chLen;
                updated.length = chLen;
                updated.physicalLength = chLen;
                updated.dimX = chLen * PX_PER_M;
              } else {
                const num = parseFloat(val);
                if (!isNaN(num) && num > 0) {
                  updated.housingLength = num;
                  updated.chamberLength = num;
                  updated.length = num;
                  updated.physicalLength = num;
                  updated.dimX = num * PX_PER_M;
                }
              }
            } else if (propName === 'housingHeight') {
              if (val === undefined || val === '') {
                delete updated.housingHeight;
                delete updated.dimY;
                delete updated.dimZ;
              } else {
                const num = parseFloat(val);
                if (!isNaN(num) && num > 0) {
                  updated.housingHeight = num;
                  updated.dimY = num * PX_PER_M;
                  updated.dimZ = num * PX_PER_M;
                }
              }
            } else {
              const chLen = updated.chamberLength ?? (updated.housingLength !== undefined ? Number(updated.housingLength) : 1.5);
              updated.dimX = chLen * PX_PER_M;
            }
          }
          if (propName === 'wallWidth' && !isNaN(val) && val !== '') {
            const w = Number(val);
            updated.wallWidth = w;
            updated.dimZ = w * PX_PER_M;
          } else if (propName === 'wallHeight' && !isNaN(val) && val !== '') {
            const h = Number(val);
            updated.wallHeight = h;
            updated.height = h;
            updated.dimY = h * PX_PER_M;
            updated.y = FLOOR_PX - (h * PX_PER_M) / 2;
          } else if (propName === 'height' && !isNaN(val) && val !== '') {
            const h = Number(val);
            if (hasManualPosition(i.type)) {
              updated.height = h;
              updated.y = BEAM_AXIS_PX - (h * PX_PER_MM_V);
              if (i.type === 'DETECTOR' || isAnchorType(i.type)) updated.stayInPath = false;
            } else if (isWallType(i.type)) {
              updated.height = h;
              updated.wallHeight = h;
              updated.dimY = h * PX_PER_M;
              if (updated.wallWidth === undefined) updated.dimZ = h * PX_PER_M;
              updated.y = FLOOR_PX - (h * PX_PER_M) / 2;
            } else if (i.type === 'CHAMBER') {
              updated.height = h;
              updated.dimY = h * PX_PER_M;
              updated.dimZ = h * PX_PER_M;
              updated.y = BEAM_AXIS_PX - (h * PX_PER_M);
            }
          } else if (propName === 'offset' && !isNaN(val) && val !== '') {
            if (hasManualPosition(i.type)) {
              const o = Number(val);
              updated.offset = o;
              updated.z = BEAM_AXIS_PX + (o * PX_PER_MM_V);
              if (i.type === 'DETECTOR' || isAnchorType(i.type)) updated.stayInPath = false;
            }
          }
          return updated;
        }
        return i;
      }));
    }
  };

  return { updateItemProp, deleteSelected };
};
