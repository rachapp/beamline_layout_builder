import { useMemo } from 'react';
import { TYPES, ORIGIN_X, PX_PER_M } from '../constants';

export const usePhysicsEngine = (items) => {
  const { computedItems, tracePointsSide, tracePointsTop } = useMemo(() => {
    const sorted = [...items].sort((a, b) => (a.distance || 0) - (b.distance || 0));

    const computePlane = (plane) => {
      const isSide = plane === 'y';
      const isBender = (type) => isSide ? type === 'VFM' : type === 'HFM';
      const isShifter = (type) => isSide ? type === 'VDCM' : type === 'HDCM';

      let tPoints = [];
      let cItemsMap = {};

      // 1. Process Architectural Elements strictly anchored to floor in Side View
      sorted.forEach(item => {
        if (['WALL', 'HUTCH'].includes(item.type)) {
          let val = item[plane];
          if (plane === 'y') {
            const conf = TYPES[item.type];
            const h = item.dimY ?? conf.height;
            val = 200 - h / 2; 
          }
          cItemsMap[item.id] = { ...item, [plane]: val };
        }
      });

      // 2. Process Traceable Optics
      const tracedItems = sorted.filter(i => !['WALL', 'HUTCH'].includes(i.type));
      const sourceIndex = tracedItems.findIndex(i => i.type === 'SOURCE');
      const startIndex = sourceIndex >= 0 ? sourceIndex : 0;
      const source = tracedItems[startIndex];
      
      if (!source) return { tPoints, cItemsMap };

      let currSlope = 0;
      let prevDist = source.distance || 0;
      let currVal = source[plane];
      let beamActive = true; 

      for (let i = 0; i < startIndex; i++) {
        cItemsMap[tracedItems[i].id] = { ...tracedItems[i], [plane]: currVal };
      }

      cItemsMap[source.id] = { ...source, [plane]: currVal };
      tPoints.push({ x: source.x, [plane]: currVal, parentId: source.id, sub: 0 });

      for (let i = startIndex + 1; i < tracedItems.length; i++) {
        const item = tracedItems[i];
        const isGratingActive = item.type === 'GRATING' && ((plane === 'y' && (item.orientation || 'Vertical') === 'Vertical') || (plane === 'z' && item.orientation === 'Horizontal'));

        if (isShifter(item.type)) {
          const D_m = item.exitOffset ?? 0.5;
          const D = D_m * PX_PER_M;
          const theta_deg = item.braggAngle ?? 20;
          const theta = theta_deg * Math.PI / 180;
          
          const tan2theta = Math.tan(2 * theta);
          const L = Math.abs(tan2theta) > 0.001 ? Math.abs(D / tan2theta) : 40;

          const x_C1 = item.x;
          const val_C1 = currVal + currSlope * (item.distance - prevDist);
          if (beamActive) tPoints.push({ x: x_C1, [plane]: val_C1, parentId: item.id, sub: 1 });

          const val_C2 = val_C1 - D;
          const x_C2 = x_C1 + L;
          if (beamActive) tPoints.push({ x: x_C2, [plane]: val_C2, parentId: item.id, sub: 2 });

          currVal = val_C2;
          prevDist = (x_C2 - ORIGIN_X) / PX_PER_M;
          cItemsMap[item.id] = { ...item, [plane]: (val_C1 + val_C2) / 2 };

        } else if (isBender(item.type)) {
          const hitVal = currVal + currSlope * (item.distance - prevDist);
          if (beamActive) tPoints.push({ x: item.x, [plane]: hitVal, parentId: item.id, sub: 0 });
          cItemsMap[item.id] = { ...item, [plane]: hitVal };

          let nextAnchor = null;
          for (let j = i + 1; j < tracedItems.length; j++) {
            if (isBender(tracedItems[j].type) || tracedItems[j].type === 'DETECTOR') {
              nextAnchor = tracedItems[j];
              break;
            }
          }

          if (nextAnchor) {
            const distDiff = Math.max(0.001, nextAnchor.distance - item.distance);
            currSlope = (nextAnchor[plane] - hitVal) / distDiff;
          }
          currVal = hitVal;
          prevDist = item.distance;

        } else if (isGratingActive) {
          const hitVal = currVal + currSlope * (item.distance - prevDist);
          if (beamActive) tPoints.push({ x: item.x, [plane]: hitVal, parentId: item.id, sub: 0 });
          cItemsMap[item.id] = { ...item, [plane]: hitVal };
          
          const parsedDeflect = parseFloat(item.diffractAngle);
          const actualDeflect = isNaN(parsedDeflect) ? 15 : parsedDeflect;
          
          const incidentAngle = Math.atan2(currSlope, PX_PER_M);
          const outAngle = incidentAngle + (actualDeflect * Math.PI / 180);
          
          currSlope = Math.tan(outAngle) * PX_PER_M;
          currVal = hitVal;
          prevDist = item.distance;

        } else {
          const hitVal = currVal + currSlope * (item.distance - prevDist);
          if (beamActive) tPoints.push({ x: item.x, [plane]: hitVal, parentId: item.id, sub: 0 });
          cItemsMap[item.id] = { ...item, [plane]: hitVal };
          
          currVal = hitVal;
          prevDist = item.distance;
        }

        if ((item.type === 'SAMPLE' && item.passLight === false) || (item.type === 'DETECTOR' && item.passLight !== true)) {
           beamActive = false; 
        }
      }
      return { tPoints, cItemsMap };
    };

    const sideData = computePlane('y');
    const topData = computePlane('z');

    const mergedItems = items.map(item => ({
      ...item,
      y: sideData.cItemsMap[item.id]?.y !== undefined ? sideData.cItemsMap[item.id].y : item.y,
      z: topData.cItemsMap[item.id]?.z !== undefined ? topData.cItemsMap[item.id].z : item.z,
    }));

    return {
      computedItems: mergedItems,
      tracePointsSide: sideData.tPoints,
      tracePointsTop: topData.tPoints
    };
  }, [items]);

  return { computedItems, tracePointsSide, tracePointsTop };
};
