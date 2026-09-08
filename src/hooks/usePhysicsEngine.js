import { useMemo } from 'react';
import { TYPES, ORIGIN_X, PX_PER_M } from '../constants/index.js';

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
      // Note: CHAMBER is a construction element that can float.
      sorted.forEach(item => {
        if (['WALL', 'HUTCH', 'CHAMBER'].includes(item.type)) {
          let val = item[plane];
          if (plane === 'y' && item.type !== 'CHAMBER') {
            const conf = TYPES[item.type];
            const h = item.dimY ?? conf.height;
            val = 200 - h / 2; 
          }
          cItemsMap[item.id] = { ...item, [plane]: val };
        }
      });

      // 2. Process Traceable Optics
      const tracedItems = sorted.filter(i => !['WALL', 'HUTCH', 'CHAMBER'].includes(i.type));
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
          const parsedD = parseFloat(item.exitOffset);
          const D_m = !isNaN(parsedD) ? parsedD : 0.5;
          const D = D_m * PX_PER_M;
          const parsedTheta = parseFloat(item.braggAngle);
          const theta_deg = !isNaN(parsedTheta) ? parsedTheta : 20;
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
            const cand = tracedItems[j];
            const isMatchingAnchor = (plane === 'y' && (cand.type === 'ANCHOR_SIDE' || cand.type === 'ANCHOR')) ||
                                     (plane === 'z' && (cand.type === 'ANCHOR_TOP' || cand.type === 'ANCHOR'));
            if (isBender(cand.type) || isMatchingAnchor || cand.type === 'DETECTOR') {
              nextAnchor = cand;
              break;
            }
          }

          if (nextAnchor) {
            const distDiff = Math.max(0.001, nextAnchor.distance - item.distance);
            let anchorTargetVal = nextAnchor[plane];
            const isAnchorItem = ['ANCHOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'].includes(nextAnchor.type);
            if (isAnchorItem || (nextAnchor.type === 'DETECTOR' && (nextAnchor.stayInPath === false || nextAnchor.detectorType === 'Virtual Anchor'))) {
              anchorTargetVal = plane === 'y'
                ? (nextAnchor.height !== undefined ? 150 - nextAnchor.height * PX_PER_M : (nextAnchor.y ?? 150))
                : (nextAnchor.offset !== undefined ? 150 + nextAnchor.offset * PX_PER_M : (nextAnchor.z ?? 150));
            } else if (anchorTargetVal === undefined) {
              anchorTargetVal = plane === 'y'
                ? 150 - (nextAnchor.height ?? 0) * PX_PER_M
                : 150 + (nextAnchor.offset ?? 0) * PX_PER_M;
            }
            currSlope = (anchorTargetVal - hitVal) / distDiff;
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
          
          const isFixedAnchor = ['ANCHOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'].includes(item.type);
          const isFixedDetector = isFixedAnchor || (item.type === 'DETECTOR' && (item.stayInPath === false || item.detectorType === 'Virtual Anchor'));
          let planeVal = hitVal;
          if (isFixedAnchor) {
            if (item.type === 'ANCHOR_SIDE') {
              planeVal = plane === 'y' 
                ? (item.height !== undefined ? 150 - item.height * PX_PER_M : (item.y ?? 150))
                : hitVal;
            } else if (item.type === 'ANCHOR_TOP') {
              planeVal = plane === 'z'
                ? (item.offset !== undefined ? 150 + item.offset * PX_PER_M : (item.z ?? 150))
                : hitVal;
            } else {
              planeVal = plane === 'y'
                ? (item.height !== undefined ? 150 - item.height * PX_PER_M : (item.y ?? 150))
                : (item.offset !== undefined ? 150 + item.offset * PX_PER_M : (item.z ?? 150));
            }
          } else if (isFixedDetector) {
            planeVal = plane === 'y'
              ? (item.height !== undefined ? 150 - item.height * PX_PER_M : (item.y ?? 150))
              : (item.offset !== undefined ? 150 + item.offset * PX_PER_M : (item.z ?? 150));
          }

          cItemsMap[item.id] = { ...item, [plane]: planeVal };
          
          currVal = hitVal;
          prevDist = item.distance;
        }

        if (cItemsMap[item.id]) {
          cItemsMap[item.id].slope = currSlope;
        }

        if ((item.type === 'SAMPLE' && item.passLight === false) || (item.type === 'DETECTOR' && item.passLight !== true && item.detectorType !== 'Virtual Anchor')) {
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
      slopeSide: sideData.cItemsMap[item.id]?.slope ?? 0,
      slopeTop: topData.cItemsMap[item.id]?.slope ?? 0
    }));

    return {
      computedItems: mergedItems,
      tracePointsSide: sideData.tPoints,
      tracePointsTop: topData.tPoints
    };
  }, [items]);

  return { computedItems, tracePointsSide, tracePointsTop };
};
