// A tighter 3D bin packing heuristic based on free-space splitting

export const CONTAINERS = {
  '20dc': { name: "20' Standard (DC)", w: 235, h: 239, d: 590, weightLimit: 28000 },
  '40dc': { name: "40' Standard (DC)", w: 235, h: 239, d: 1203, weightLimit: 28800 },
  '40hc': { name: "40' High Cube (HC)", w: 235, h: 269, d: 1203, weightLimit: 28600 },
};

function getOrientations(item) {
  const { w, h, d } = item;

  if (item.stackable === false) {
    return [
      { w, h, d },
      { w: d, h, d: w },
    ];
  }

  return [
    { w, h, d },
    { w, h: d, d: h },
    { w: h, h: w, d },
    { w: h, h: d, d: w },
    { w: d, h: w, d: h },
    { w: d, h, d: w },
  ];
}

function getOverlap(startA, endA, startB, endB) {
  return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
}

function pruneSpaces(spaces) {
  const filtered = spaces.filter((space, index) => {
    if (space.w <= 0 || space.h <= 0 || space.d <= 0) return false;

    return !spaces.some((other, otherIndex) => {
      if (index === otherIndex) return false;

      const containsOnX = space.x >= other.x && space.x + space.w <= other.x + other.w;
      const containsOnY = space.y >= other.y && space.y + space.h <= other.y + other.h;
      const containsOnZ = space.z >= other.z && space.z + space.d <= other.z + other.d;

      return containsOnX && containsOnY && containsOnZ;
    });
  });

  const unique = [];
  const seen = new Set();

  filtered.forEach((space) => {
    const key = `${space.x}:${space.y}:${space.z}:${space.w}:${space.h}:${space.d}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(space);
    }
  });

  return unique;
}

function getSupportRatio(space, orientation, placed) {
  if (space.y === 0) return 1;

  const x1 = space.x;
  const x2 = space.x + orientation.w;
  const z1 = space.z;
  const z2 = space.z + orientation.d;

  const supporters = placed.filter((item) => {
    const topY = item.y + item.placedH;
    if (topY !== space.y) return false;

    return (
      getOverlap(x1, x2, item.x, item.x + item.placedW) > 0 &&
      getOverlap(z1, z2, item.z, item.z + item.placedD) > 0
    );
  });

  if (supporters.length === 0) return 0;

  const xBreaks = [x1, x2];
  const zBreaks = [z1, z2];

  supporters.forEach((item) => {
    xBreaks.push(Math.max(x1, item.x), Math.min(x2, item.x + item.placedW));
    zBreaks.push(Math.max(z1, item.z), Math.min(z2, item.z + item.placedD));
  });

  const sortedX = [...new Set(xBreaks)].sort((a, b) => a - b);
  const sortedZ = [...new Set(zBreaks)].sort((a, b) => a - b);

  let coveredArea = 0;
  let totalArea = 0;

  for (let xi = 0; xi < sortedX.length - 1; xi += 1) {
    for (let zi = 0; zi < sortedZ.length - 1; zi += 1) {
      const cellX1 = sortedX[xi];
      const cellX2 = sortedX[xi + 1];
      const cellZ1 = sortedZ[zi];
      const cellZ2 = sortedZ[zi + 1];
      const area = (cellX2 - cellX1) * (cellZ2 - cellZ1);

      if (area <= 0) continue;

      totalArea += area;

      const centerX = (cellX1 + cellX2) / 2;
      const centerZ = (cellZ1 + cellZ2) / 2;

      const isCovered = supporters.some((item) => (
        centerX >= item.x &&
        centerX <= item.x + item.placedW &&
        centerZ >= item.z &&
        centerZ <= item.z + item.placedD
      ));

      if (isCovered) {
        coveredArea += area;
      }
    }
  }

  return totalArea > 0 ? coveredArea / totalArea : 0;
}

function compareCandidates(a, b) {
  const checks = [
    ['y', 'asc'],
    ['z', 'asc'],
    ['supportRatio', 'desc'],
    ['leftoverVolume', 'asc'],
    ['slack', 'asc'],
    ['x', 'asc'],
  ];

  for (const [key, direction] of checks) {
    if (a[key] === b[key]) continue;
    return direction === 'asc' ? a[key] - b[key] : b[key] - a[key];
  }

  return 0;
}

export function packItems(containerType, items) {
  const container = CONTAINERS[containerType];
  if (!container) return { placed: [], unplaced: items };

  const sortedItems = [...items].sort((a, b) => (b.w * b.h * b.d) - (a.w * a.h * a.d));

  let spaces = [
    { x: 0, y: 0, z: 0, w: container.w, h: container.h, d: container.d },
  ];

  const placed = [];
  const unplaced = [];

  for (const item of sortedItems) {
    spaces = pruneSpaces(spaces);

    let bestCandidate = null;

    for (let i = 0; i < spaces.length; i += 1) {
      const space = spaces[i];
      const orientations = getOrientations(item);

      for (const orientation of orientations) {
        if (
          orientation.w > space.w ||
          orientation.h > space.h ||
          orientation.d > space.d
        ) {
          continue;
        }

        const supportRatio = getSupportRatio(space, orientation, placed);
        if (supportRatio < 0.999) continue;

        const candidate = {
          spaceIndex: i,
          space,
          orientation,
          x: space.x,
          y: space.y,
          z: space.z,
          supportRatio,
          leftoverVolume: (space.w * space.h * space.d) - (orientation.w * orientation.h * orientation.d),
          slack: (space.w - orientation.w) + (space.h - orientation.h) + (space.d - orientation.d),
        };

        if (!bestCandidate || compareCandidates(candidate, bestCandidate) < 0) {
          bestCandidate = candidate;
        }
      }
    }

    if (!bestCandidate) {
      unplaced.push(item);
      continue;
    }

    const { spaceIndex, space, orientation } = bestCandidate;

    placed.push({
      ...item,
      x: space.x,
      y: space.y,
      z: space.z,
      placedW: orientation.w,
      placedH: orientation.h,
      placedD: orientation.d,
    });

    spaces.splice(spaceIndex, 1);

    if (space.w - orientation.w > 0) {
      spaces.push({
        x: space.x + orientation.w,
        y: space.y,
        z: space.z,
        w: space.w - orientation.w,
        h: space.h,
        d: space.d,
      });
    }

    if (space.h - orientation.h > 0) {
      spaces.push({
        x: space.x,
        y: space.y + orientation.h,
        z: space.z,
        w: orientation.w,
        h: space.h - orientation.h,
        d: space.d,
      });
    }

    if (space.d - orientation.d > 0) {
      spaces.push({
        x: space.x,
        y: space.y,
        z: space.z + orientation.d,
        w: orientation.w,
        h: orientation.h,
        d: space.d - orientation.d,
      });
    }
  }

  const containerVol = container.w * container.h * container.d;
  const usedVol = placed.reduce((sum, item) => sum + (item.w * item.h * item.d), 0);

  return {
    placed,
    unplaced,
    stats: {
      containerVol,
      usedVol,
      utilization: ((usedVol / containerVol) * 100).toFixed(2),
      containerDims: container,
    },
  };
}
