import { useMemo } from 'react';
import { TYPES, ORIGIN_X, PX_PER_M, PX_PER_MM_V, PX_PER_M_V } from '../constants/index.js';

export const usePhysicsEngine = (items) => {
  const { computedItems, tracePointsSide, tracePointsTop, tracePointsSideBranch, tracePointsTopBranch } = useMemo(() => {
    const sorted = [...items].sort((a, b) => (a.distance || 0) - (b.distance || 0));

    const computePlane = (plane) => {
      const isSide = plane === 'y';
      const isBender = (type) => isSide ? type === 'VFM' : type === 'HFM';
      const isShifter = (type) => isSide ? type === 'VDCM' : type === 'HDCM';
      const isSplitter = (type) => type === 'VSPLIT' || type === 'HSPLIT';
      const isSplittingPlane = (type) => (plane === 'y' && type === 'VSPLIT') || (plane === 'z' && type === 'HSPLIT');

      let tPoints = [];
      let tPointsBranch = [];
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
      const srcH_mm = source.height !== undefined ? Number(source.height) : 0;
      const srcO_mm = source.offset !== undefined ? Number(source.offset) : 0;
      let currVal = plane === 'y'
        ? (source.height !== undefined ? 150 - srcH_mm * PX_PER_MM_V : (source.y ?? 150))
        : (source.offset !== undefined ? 150 + srcO_mm * PX_PER_MM_V : (source.z ?? 150));
      let beamActive = true; 

      // Diffracted branch ray state
      let hasSplitter = false;
      let currValBranch = null;
      let currSlopeBranch = 0;
      let prevDistBranch = null;
      let beamActiveBranch = true;
      let branchAnchor = null;

      for (let i = 0; i < startIndex; i++) {
        cItemsMap[tracedItems[i].id] = { ...tracedItems[i], [plane]: currVal, branch: 'straight' };
      }

      cItemsMap[source.id] = { ...source, [plane]: currVal, branch: 'straight' };
      tPoints.push({ x: source.x, [plane]: currVal, parentId: source.id, sub: 0 });

      for (let i = startIndex + 1; i < tracedItems.length; i++) {
        const item = tracedItems[i];
        const isGratingActive = item.type === 'GRATING' && ((plane === 'y' && (item.orientation || 'Vertical') === 'Vertical') || (plane === 'z' && item.orientation === 'Horizontal'));

        // If downstream of an active splitter, check which branch this item belongs to
        if (hasSplitter) {
          const hitValStraight = currVal + currSlope * (item.distance - prevDist);
          const hitValBranch = currValBranch + currSlopeBranch * (item.distance - prevDistBranch);

          // Strict branch assignment: Only items explicitly placed/set on the diffracted branch belong to it.
          // All other components strictly stay on the main straight branch.
          const itemBranch = (item.branch === 'diffracted' || (branchAnchor && branchAnchor.id === item.id))
            ? 'diffracted'
            : 'straight';

          if (itemBranch === 'diffracted') {
            const hitVal = hitValBranch;
            const isFixedAnchor = ['ANCHOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'].includes(item.type);
            const isFixedDetector = isFixedAnchor || (item.type === 'DETECTOR' && (item.stayInPath === false || item.detectorType === 'Virtual Anchor'));
            let planeVal = hitVal;
            if (isFixedAnchor) {
              if (item.type === 'ANCHOR_SIDE') {
                const h_mm = item.height !== undefined ? Number(item.height) : 0;
                planeVal = plane === 'y' ? (item.height !== undefined ? 150 - h_mm * PX_PER_MM_V : (item.y ?? 150)) : hitVal;
              } else if (item.type === 'ANCHOR_TOP') {
                const o_mm = item.offset !== undefined ? Number(item.offset) : 0;
                planeVal = plane === 'z' ? (item.offset !== undefined ? 150 + o_mm * PX_PER_MM_V : (item.z ?? 150)) : hitVal;
              } else {
                const h_mm = item.height !== undefined ? Number(item.height) : 0;
                const o_mm = item.offset !== undefined ? Number(item.offset) : 0;
                planeVal = plane === 'y' ? (item.height !== undefined ? 150 - h_mm * PX_PER_MM_V : (item.y ?? 150)) : (item.offset !== undefined ? 150 + o_mm * PX_PER_MM_V : (item.z ?? 150));
              }
            } else if (isFixedDetector) {
              const h_mm = item.height !== undefined ? Number(item.height) : 0;
              const o_mm = item.offset !== undefined ? Number(item.offset) : 0;
              planeVal = plane === 'y' ? (item.height !== undefined ? 150 - h_mm * PX_PER_MM_V : (item.y ?? 150)) : (item.offset !== undefined ? 150 + o_mm * PX_PER_MM_V : (item.z ?? 150));
            }
            let itemGrazingAngleMrad = undefined;
            let itemDeflectAngleMrad = undefined;

            if (isBender(item.type)) {
              let nextAnchor = null;
              for (let j = i + 1; j < tracedItems.length; j++) {
                const cand = tracedItems[j];
                const isMatchingAnchor = (plane === 'y' && (cand.type === 'ANCHOR_SIDE' || cand.type === 'ANCHOR')) ||
                                         (plane === 'z' && (cand.type === 'ANCHOR_TOP' || cand.type === 'ANCHOR'));
                if (cand.branch === 'diffracted' && (isBender(cand.type) || isMatchingAnchor || cand.type === 'DETECTOR')) {
                  nextAnchor = cand;
                  break;
                }
              }

              const inSlope = currSlopeBranch;
              let newSlope = currSlopeBranch;
              let grazingAngleMrad = 0;
              let deflectAngleMrad = 0;
              const sign = plane === 'y' ? -1 : 1;

              if (nextAnchor) {
                const distDiff = Math.max(0.001, nextAnchor.distance - item.distance);
                let anchorTargetVal = nextAnchor[plane];
                const isAnchorItem = ['ANCHOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'].includes(nextAnchor.type);
                if (isAnchorItem || (nextAnchor.type === 'DETECTOR' && (nextAnchor.stayInPath === false || nextAnchor.detectorType === 'Virtual Anchor'))) {
                  const h_mm = nextAnchor.height !== undefined ? Number(nextAnchor.height) : 0;
                  const o_mm = nextAnchor.offset !== undefined ? Number(nextAnchor.offset) : 0;
                  anchorTargetVal = plane === 'y'
                    ? (nextAnchor.height !== undefined ? 150 - h_mm * PX_PER_MM_V : (nextAnchor.y ?? 150))
                    : (nextAnchor.offset !== undefined ? 150 + o_mm * PX_PER_MM_V : (nextAnchor.z ?? 150));
                } else if (anchorTargetVal === undefined) {
                  const h_mm = nextAnchor.height !== undefined ? Number(nextAnchor.height) : 0;
                  const o_mm = nextAnchor.offset !== undefined ? Number(nextAnchor.offset) : 0;
                  anchorTargetVal = plane === 'y'
                    ? 150 - h_mm * PX_PER_MM_V
                    : 150 + o_mm * PX_PER_MM_V;
                }
                newSlope = (anchorTargetVal - hitVal) / distDiff;
                const m_in = (sign * inSlope) / PX_PER_M_V;
                const m_out = (sign * newSlope) / PX_PER_M_V;
                const theta_in = Math.atan(m_in);
                const theta_out = Math.atan(m_out);
                const deltaTheta = Math.abs(theta_out - theta_in);
                deflectAngleMrad = deltaTheta * 1000;
                grazingAngleMrad = deflectAngleMrad / 2;
              } else if (item.grazingAngle !== undefined || item.grazingAngleMrad !== undefined) {
                const inputVal = item.grazingAngleMrad !== undefined ? parseFloat(item.grazingAngleMrad) : parseFloat(item.grazingAngle);
                if (!isNaN(inputVal) && inputVal > 0) {
                  grazingAngleMrad = inputVal;
                  deflectAngleMrad = inputVal * 2;
                  const deltaTheta = deflectAngleMrad / 1000;
                  const m_in = (sign * inSlope) / PX_PER_M_V;
                  const theta_in = Math.atan(m_in);
                  const theta_out = theta_in + (sign * deltaTheta);
                  const m_out = Math.tan(theta_out);
                  newSlope = sign * m_out * PX_PER_M_V;
                }
              }

              currSlopeBranch = newSlope;
              itemGrazingAngleMrad = grazingAngleMrad;
              itemDeflectAngleMrad = deflectAngleMrad;
            } else if (isGratingActive) {
              const parsedDeflect = parseFloat(item.diffractAngle);
              const actualDeflect = isNaN(parsedDeflect) ? 15 : parsedDeflect;
              const incidentAngle = Math.atan2(currSlopeBranch, PX_PER_M);
              const outAngle = incidentAngle + (actualDeflect * Math.PI / 180);
              currSlopeBranch = Math.tan(outAngle) * PX_PER_M;
            } else if (isShifter(item.type)) {
              const parsedD = parseFloat(item.exitOffset);
              const D_mm = !isNaN(parsedD) ? (parsedD > 0 && parsedD <= 1.0 ? parsedD * 100 : parsedD) : 25;
              const D = D_mm * PX_PER_MM_V;
              const parsedTheta = parseFloat(item.braggAngle);
              const theta_deg = !isNaN(parsedTheta) ? parsedTheta : 45;
              const theta = theta_deg * Math.PI / 180;
              const tan2theta = Math.tan(2 * theta);
              const L = Math.abs(theta_deg - 45) < 0.001 ? 0 : (Math.abs(tan2theta) > 0.001 ? Math.abs(D / tan2theta) : 0);

              const x_C1 = item.x;
              const val_C1 = planeVal;
              if (beamActiveBranch) tPointsBranch.push({ x: x_C1, [plane]: val_C1, parentId: item.id, sub: 1 });

              const val_C2 = val_C1 - D;
              const x_C2 = x_C1 + L;
              if (beamActiveBranch) tPointsBranch.push({ x: x_C2, [plane]: val_C2, parentId: item.id, sub: 2 });

              planeVal = val_C1;
              currValBranch = val_C2;
              prevDistBranch = (x_C2 - ORIGIN_X) / PX_PER_M;
            }

            cItemsMap[item.id] = {
              ...item,
              [plane]: planeVal,
              branch: 'diffracted',
              slope: currSlopeBranch,
              grazingAngleMrad: itemGrazingAngleMrad,
              deflectAngleMrad: itemDeflectAngleMrad
            };
            if (beamActiveBranch && !isShifter(item.type)) {
              tPointsBranch.push({ x: item.x, [plane]: planeVal, parentId: item.id, sub: 'branch' });
            }
            if ((item.type === 'SAMPLE' && item.passLight === false) || (item.type === 'DETECTOR' && item.passLight !== true && item.detectorType !== 'Virtual Anchor')) {
              beamActiveBranch = false;
            }
            if (!isShifter(item.type)) {
              currValBranch = planeVal;
              prevDistBranch = item.distance;
            }
            continue;
          }
        }

        if (isShifter(item.type)) {
          const parsedD = parseFloat(item.exitOffset);
          // User: 25 mm offset shifts drawn ray by 0.25 unit (5 px)
          const D_mm = !isNaN(parsedD) ? (parsedD > 0 && parsedD <= 1.0 ? parsedD * 100 : parsedD) : 25;
          const D = D_mm * PX_PER_MM_V; // 25 mm * 0.2 = 5 px = 0.25 unit grid!
          const parsedTheta = parseFloat(item.braggAngle);
          const theta_deg = !isNaN(parsedTheta) ? parsedTheta : 45;
          const theta = theta_deg * Math.PI / 180;
          
          const tan2theta = Math.tan(2 * theta);
          const L = Math.abs(theta_deg - 45) < 0.001 ? 0 : (Math.abs(tan2theta) > 0.001 ? Math.abs(D / tan2theta) : 0);

          const x_C1 = item.x;
          const val_C1 = currVal + currSlope * (item.distance - prevDist);
          if (beamActive) tPoints.push({ x: x_C1, [plane]: val_C1, parentId: item.id, sub: 1 });

          const val_C2 = val_C1 - D;
          const x_C2 = x_C1 + L;
          if (beamActive) tPoints.push({ x: x_C2, [plane]: val_C2, parentId: item.id, sub: 2 });

          currVal = val_C2;
          prevDist = (x_C2 - ORIGIN_X) / PX_PER_M;
          cItemsMap[item.id] = { ...item, [plane]: val_C1, branch: 'straight' };

        } else if (isBender(item.type)) {
          const hitVal = currVal + currSlope * (item.distance - prevDist);
          if (beamActive) tPoints.push({ x: item.x, [plane]: hitVal, parentId: item.id, sub: 0 });
          cItemsMap[item.id] = { ...item, [plane]: hitVal, branch: 'straight' };

          let nextAnchor = null;
          for (let j = i + 1; j < tracedItems.length; j++) {
            const cand = tracedItems[j];
            const isMatchingAnchor = (plane === 'y' && (cand.type === 'ANCHOR_SIDE' || cand.type === 'ANCHOR')) ||
                                     (plane === 'z' && (cand.type === 'ANCHOR_TOP' || cand.type === 'ANCHOR'));
            if (cand.branch !== 'diffracted' && (isBender(cand.type) || isMatchingAnchor || cand.type === 'DETECTOR')) {
              nextAnchor = cand;
              break;
            }
          }

          const inSlope = currSlope;
          let newSlope = currSlope;
          let grazingAngleMrad = 0;
          let deflectAngleMrad = 0;

          if (nextAnchor) {
            const distDiff = Math.max(0.001, nextAnchor.distance - item.distance);
            let anchorTargetVal = nextAnchor[plane];
            const isAnchorItem = ['ANCHOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'].includes(nextAnchor.type);
            if (isAnchorItem || (nextAnchor.type === 'DETECTOR' && (nextAnchor.stayInPath === false || nextAnchor.detectorType === 'Virtual Anchor'))) {
              const h_mm = nextAnchor.height !== undefined ? Number(nextAnchor.height) : 0;
              const o_mm = nextAnchor.offset !== undefined ? Number(nextAnchor.offset) : 0;
              anchorTargetVal = plane === 'y'
                ? (nextAnchor.height !== undefined ? 150 - h_mm * PX_PER_MM_V : (nextAnchor.y ?? 150))
                : (nextAnchor.offset !== undefined ? 150 + o_mm * PX_PER_MM_V : (nextAnchor.z ?? 150));
            } else if (anchorTargetVal === undefined) {
              const h_mm = nextAnchor.height !== undefined ? Number(nextAnchor.height) : 0;
              const o_mm = nextAnchor.offset !== undefined ? Number(nextAnchor.offset) : 0;
              anchorTargetVal = plane === 'y'
                ? 150 - h_mm * PX_PER_MM_V
                : 150 + o_mm * PX_PER_MM_V;
            }
            newSlope = (anchorTargetVal - hitVal) / distDiff;

            // Physical angle calculation in mrad:
            // For 'y' (Side): Elevation Y (m) = (150 - y) / PX_PER_M_V, so slope_real = -slope / PX_PER_M_V
            // For 'z' (Top):  Offset Z (m) = (z - 150) / PX_PER_M_V, so slope_real = +slope / PX_PER_M_V
            const sign = plane === 'y' ? -1 : 1;
            const m_in = (sign * inSlope) / PX_PER_M_V;
            const m_out = (sign * newSlope) / PX_PER_M_V;
            const theta_in = Math.atan(m_in);
            const theta_out = Math.atan(m_out);
            const deltaTheta = Math.abs(theta_out - theta_in);
            deflectAngleMrad = deltaTheta * 1000;
            grazingAngleMrad = deflectAngleMrad / 2;
          } else if (item.grazingAngle !== undefined || item.grazingAngleMrad !== undefined) {
            const inputVal = item.grazingAngleMrad !== undefined ? parseFloat(item.grazingAngleMrad) : parseFloat(item.grazingAngle);
            if (!isNaN(inputVal) && inputVal > 0) {
              grazingAngleMrad = inputVal;
              deflectAngleMrad = inputVal * 2;
              const deltaTheta = deflectAngleMrad / 1000;
              const sign = plane === 'y' ? -1 : 1;
              const m_in = (sign * inSlope) / PX_PER_M_V;
              const theta_in = Math.atan(m_in);
              const theta_out = theta_in + (sign * deltaTheta);
              const m_out = Math.tan(theta_out);
              newSlope = sign * m_out * PX_PER_M_V;
            }
          }

          currSlope = newSlope;
          cItemsMap[item.id].grazingAngleMrad = grazingAngleMrad;
          cItemsMap[item.id].deflectAngleMrad = deflectAngleMrad;
          currVal = hitVal;
          prevDist = item.distance;

        } else if (isSplitter(item.type)) {
          hasSplitter = true;
          const hitVal = currVal + currSlope * (item.distance - prevDist);
          if (beamActive) tPoints.push({ x: item.x, [plane]: hitVal, parentId: item.id, sub: 0 });
          cItemsMap[item.id] = { ...item, [plane]: hitVal, branch: 'straight' };

          // Start diffracted branch ray
          tPointsBranch.push({ x: item.x, [plane]: hitVal, parentId: item.id, sub: 'branch' });

          if (isSplittingPlane(item.type)) {
            // Find downstream anchor for diffracted branch
            branchAnchor = null;
            for (let j = i + 1; j < tracedItems.length; j++) {
              const cand = tracedItems[j];
              const isMatchingAnchor = (plane === 'y' && (cand.type === 'ANCHOR_SIDE' || cand.type === 'ANCHOR')) ||
                                       (plane === 'z' && (cand.type === 'ANCHOR_TOP' || cand.type === 'ANCHOR')) ||
                                       (cand.type === 'DETECTOR' && (cand.stayInPath === false || cand.detectorType === 'Virtual Anchor'));
              if (isMatchingAnchor && cand.branch === 'diffracted') {
                branchAnchor = cand;
                break;
              }
            }

            let deltaThetaDeg = 0;
            const sign = plane === 'y' ? -1 : 1;
            const m_in = (sign * currSlope) / PX_PER_M_V;

            if (branchAnchor) {
              const distDiff = Math.max(0.001, branchAnchor.distance - item.distance);
              let anchorTargetVal = branchAnchor[plane];
              const isAnchorItem = ['ANCHOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'].includes(branchAnchor.type);
              if (isAnchorItem || (branchAnchor.type === 'DETECTOR' && (branchAnchor.stayInPath === false || branchAnchor.detectorType === 'Virtual Anchor'))) {
                const h_mm = branchAnchor.height !== undefined ? Number(branchAnchor.height) : 0;
                const o_mm = branchAnchor.offset !== undefined ? Number(branchAnchor.offset) : 0;
                anchorTargetVal = plane === 'y'
                  ? (branchAnchor.height !== undefined ? 150 - h_mm * PX_PER_MM_V : (branchAnchor.y ?? 150))
                  : (branchAnchor.offset !== undefined ? 150 + o_mm * PX_PER_MM_V : (branchAnchor.z ?? 150));
              } else if (anchorTargetVal === undefined) {
                const h_mm = branchAnchor.height !== undefined ? Number(branchAnchor.height) : 0;
                const o_mm = branchAnchor.offset !== undefined ? Number(branchAnchor.offset) : 0;
                anchorTargetVal = plane === 'y'
                  ? 150 - h_mm * PX_PER_MM_V
                  : 150 + o_mm * PX_PER_MM_V;
              }
              currSlopeBranch = (anchorTargetVal - hitVal) / distDiff;
              const m_out = (sign * currSlopeBranch) / PX_PER_M_V;
              deltaThetaDeg = Math.abs(Math.atan(m_out) - Math.atan(m_in)) * (180 / Math.PI);
            } else {
              deltaThetaDeg = !isNaN(parseFloat(item.diffractAngle)) ? parseFloat(item.diffractAngle) : 0.5;
              const deltaThetaRad = deltaThetaDeg * (Math.PI / 180);
              const m_out = Math.tan(Math.atan(m_in) + sign * deltaThetaRad);
              currSlopeBranch = sign * m_out * PX_PER_M_V;
            }

            cItemsMap[item.id].diffractAngle = parseFloat(deltaThetaDeg.toFixed(3));
            cItemsMap[item.id].diffractAngleDeg = parseFloat(deltaThetaDeg.toFixed(3));
          } else {
            currSlopeBranch = currSlope;
          }

          currValBranch = hitVal;
          prevDistBranch = item.distance;
          beamActiveBranch = beamActive;

          currVal = hitVal;
          prevDist = item.distance;

        } else if (isGratingActive) {
          const hitVal = currVal + currSlope * (item.distance - prevDist);
          if (beamActive) tPoints.push({ x: item.x, [plane]: hitVal, parentId: item.id, sub: 0 });
          cItemsMap[item.id] = { ...item, [plane]: hitVal, branch: 'straight' };
          
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
              const h_mm = item.height !== undefined ? Number(item.height) : 0;
              planeVal = plane === 'y' 
                ? (item.height !== undefined ? 150 - h_mm * PX_PER_MM_V : (item.y ?? 150))
                : hitVal;
            } else if (item.type === 'ANCHOR_TOP') {
              const o_mm = item.offset !== undefined ? Number(item.offset) : 0;
              planeVal = plane === 'z' 
                ? (item.offset !== undefined ? 150 + o_mm * PX_PER_MM_V : (item.z ?? 150))
                : hitVal;
            } else {
              const h_mm = item.height !== undefined ? Number(item.height) : 0;
              const o_mm = item.offset !== undefined ? Number(item.offset) : 0;
              planeVal = plane === 'y' 
                ? (item.height !== undefined ? 150 - h_mm * PX_PER_MM_V : (item.y ?? 150))
                : (item.offset !== undefined ? 150 + o_mm * PX_PER_MM_V : (item.z ?? 150));
            }
          } else if (isFixedDetector) {
            const h_mm = item.height !== undefined ? Number(item.height) : 0;
            const o_mm = item.offset !== undefined ? Number(item.offset) : 0;
            planeVal = plane === 'y' 
              ? (item.height !== undefined ? 150 - h_mm * PX_PER_MM_V : (item.y ?? 150))
              : (item.offset !== undefined ? 150 + o_mm * PX_PER_MM_V : (item.z ?? 150));
          }

          cItemsMap[item.id] = { ...item, [plane]: planeVal, branch: 'straight' };
          
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

      // If diffracted branch is active and has points, extend to end of beamline
      if (hasSplitter && beamActiveBranch && tPointsBranch.length > 0) {
        const lastTraced = tracedItems[tracedItems.length - 1];
        const targetDist = lastTraced && lastTraced.distance > prevDistBranch
          ? lastTraced.distance
          : (prevDistBranch !== null ? prevDistBranch + 5 : 20);
        if (targetDist > prevDistBranch) {
          const endValBranch = currValBranch + currSlopeBranch * (targetDist - prevDistBranch);
          const endX = ORIGIN_X + targetDist * PX_PER_M;
          tPointsBranch.push({ x: endX, [plane]: endValBranch, parentId: 'branch_end', sub: 'branch' });
        }
      }

      return { tPoints, tPointsBranch, cItemsMap };
    };

    const sideData = computePlane('y');
    const topData = computePlane('z');

    const mergedItems = items.map(item => ({
      ...item,
      y: sideData.cItemsMap[item.id]?.y !== undefined ? sideData.cItemsMap[item.id].y : item.y,
      z: topData.cItemsMap[item.id]?.z !== undefined ? topData.cItemsMap[item.id].z : item.z,
      slopeSide: sideData.cItemsMap[item.id]?.slope ?? 0,
      slopeTop: topData.cItemsMap[item.id]?.slope ?? 0,
      grazingAngleMrad: item.type === 'VFM' ? sideData.cItemsMap[item.id]?.grazingAngleMrad : (item.type === 'HFM' ? topData.cItemsMap[item.id]?.grazingAngleMrad : undefined),
      deflectAngleMrad: item.type === 'VFM' ? sideData.cItemsMap[item.id]?.deflectAngleMrad : (item.type === 'HFM' ? topData.cItemsMap[item.id]?.deflectAngleMrad : undefined),
      diffractAngleDeg: ['VSPLIT', 'HSPLIT'].includes(item.type) ? (item.type === 'VSPLIT' ? sideData.cItemsMap[item.id]?.diffractAngleDeg : topData.cItemsMap[item.id]?.diffractAngleDeg) : undefined,
      diffractAngle: ['VSPLIT', 'HSPLIT'].includes(item.type) ? (item.type === 'VSPLIT' ? sideData.cItemsMap[item.id]?.diffractAngle : topData.cItemsMap[item.id]?.diffractAngle) : item.diffractAngle,
      branch: sideData.cItemsMap[item.id]?.branch || topData.cItemsMap[item.id]?.branch || item.branch || 'straight'
    }));

    return {
      computedItems: mergedItems,
      tracePointsSide: sideData.tPoints,
      tracePointsTop: topData.tPoints,
      tracePointsSideBranch: sideData.tPointsBranch || [],
      tracePointsTopBranch: topData.tPointsBranch || []
    };
  }, [items]);

  return { computedItems, tracePointsSide, tracePointsTop, tracePointsSideBranch, tracePointsTopBranch };
};
