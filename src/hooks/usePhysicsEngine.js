import { useMemo } from 'react';
import { computeBeamPaths } from '../utils/physics.js';

export const usePhysicsEngine = (items) => useMemo(() => computeBeamPaths(items), [items]);
