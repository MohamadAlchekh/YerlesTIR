// A simple 3D Bin Packing heuristic based on splitting spaces

export const CONTAINERS = {
  '20dc': { name: "20' Standard (DC)", w: 235, h: 239, d: 590, weightLimit: 28000 },
  '40dc': { name: "40' Standard (DC)", w: 235, h: 239, d: 1203, weightLimit: 28800 },
  '40hc': { name: "40' High Cube (HC)", w: 235, h: 269, d: 1203, weightLimit: 28600 },
};

function getOrientations(item) {
  const { w, h, d } = item;
  // If not stackable, we might want to restrict height to be the original height. 
  // For simplicity, we assume we can rotate any way unless specified.
  if (item.stackable === false) {
    // If not stackable, maybe only allow rotations around Y axis
    return [
      { w, h, d },
      { w: d, h, d: w }
    ];
  }
  
  // All 6 orientations
  return [
    { w, h, d },
    { w, h: d, d: h },
    { w: h, h: w, d },
    { w: h, h: d, d: w },
    { w: d, h: w, d: h },
    { w: d, h, d: w }
  ];
}

export function packItems(containerType, items) {
  const container = CONTAINERS[containerType];
  if (!container) return { placed: [], unplaced: items };

  // Sort items by volume descending
  const sortedItems = [...items].sort((a, b) => (b.w * b.h * b.d) - (a.w * a.h * a.d));

  let spaces = [
    { x: 0, y: 0, z: 0, w: container.w, h: container.h, d: container.d }
  ];

  const placed = [];
  const unplaced = [];

  for (const item of sortedItems) {
    let fitted = false;
    
    // Sort spaces by smallest Z, then Y, then X to pack bottom-back-left first
    spaces.sort((a, b) => {
      if (a.z !== b.z) return a.z - b.z;
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });

    for (let i = 0; i < spaces.length; i++) {
      const space = spaces[i];
      const orientations = getOrientations(item);

      for (const ori of orientations) {
        if (ori.w <= space.w && ori.h <= space.h && ori.d <= space.d) {
          // Fits!
          placed.push({
            ...item,
            x: space.x,
            y: space.y,
            z: space.z,
            placedW: ori.w,
            placedH: ori.h,
            placedD: ori.d
          });

          // Remove the used space
          spaces.splice(i, 1);

          // Split the remaining space into 3 new spaces (Guillotine split)
          // 1. Space right of the item
          if (space.w - ori.w > 0) {
            spaces.push({
              x: space.x + ori.w,
              y: space.y,
              z: space.z,
              w: space.w - ori.w,
              h: ori.h, // Or space.h, depending on split strategy
              d: ori.d
            });
          }
          // 2. Space above the item
          if (space.h - ori.h > 0) {
            spaces.push({
              x: space.x,
              y: space.y + ori.h,
              z: space.z,
              w: space.w, // Or ori.w
              h: space.h - ori.h,
              d: ori.d
            });
          }
          // 3. Space in front of the item
          if (space.d - ori.d > 0) {
            spaces.push({
              x: space.x,
              y: space.y,
              z: space.z + ori.d,
              w: space.w,
              h: space.h,
              d: space.d - ori.d
            });
          }

          fitted = true;
          break; // Break orientation loop
        }
      }
      if (fitted) break; // Break spaces loop
    }

    if (!fitted) {
      unplaced.push(item);
    }
  }

  // Calculate volume
  const containerVol = container.w * container.h * container.d;
  const usedVol = placed.reduce((sum, item) => sum + (item.w * item.h * item.d), 0);

  return {
    placed,
    unplaced,
    stats: {
      containerVol,
      usedVol,
      utilization: ((usedVol / containerVol) * 100).toFixed(2),
      containerDims: container
    }
  };
}
