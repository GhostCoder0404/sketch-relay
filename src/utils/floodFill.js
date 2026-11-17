// High performance flood fill for HTML5 canvas
export function floodFill(ctx, startX, startY, fillColorHex, tolerance = 36) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  // Clamp starting points
  startX = Math.floor(Math.max(0, Math.min(width - 1, startX)));
  startY = Math.floor(Math.max(0, Math.min(height - 1, startY)));

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Parse fill color
  const targetColor = hexToRgba(fillColorHex);

  const startIndex = (startY * width + startX) * 4;
  const startR = data[startIndex];
  const startG = data[startIndex + 1];
  const startB = data[startIndex + 2];
  const startA = data[startIndex + 3];

  // If already matches target color within tolerance, return
  if (colorDistance(startR, startG, startB, startA, targetColor.r, targetColor.g, targetColor.b, targetColor.a) < tolerance) {
    return;
  }

  // Linear scanline or queue-based flood fill
  const visited = new Uint8Array(width * height);
  const queueX = new Int32Array(width * height);
  const queueY = new Int32Array(width * height);
  let queueHead = 0;
  let queueTail = 0;

  queueX[queueTail] = startX;
  queueY[queueTail] = startY;
  queueTail++;
  visited[startY * width + startX] = 1;

  while (queueHead < queueTail) {
    const x = queueX[queueHead];
    const y = queueY[queueHead];
    queueHead++;

    const idx = (y * width + x) * 4;
    data[idx] = targetColor.r;
    data[idx + 1] = targetColor.g;
    data[idx + 2] = targetColor.b;
    data[idx + 3] = targetColor.a;

    // Check 4 neighbors (up, down, left, right)
    const neighbors = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1]
    ];

    for (let i = 0; i < 4; i++) {
      const nx = neighbors[i][0];
      const ny = neighbors[i][1];

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIndex = ny * width + nx;
        if (!visited[nIndex]) {
          visited[nIndex] = 1;
          const pixelIdx = nIndex * 4;
          const nr = data[pixelIdx];
          const ng = data[pixelIdx + 1];
          const nb = data[pixelIdx + 2];
          const na = data[pixelIdx + 3];

          if (colorDistance(nr, ng, nb, na, startR, startG, startB, startA) <= tolerance) {
            queueX[queueTail] = nx;
            queueY[queueTail] = ny;
            queueTail++;
          }
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

function hexToRgba(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(ch => ch + ch).join('');
  }
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
    a: 255
  };
}

function colorDistance(r1, g1, b1, a1, r2, g2, b2, a2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  const da = a1 - a2;
  return Math.sqrt(dr * dr + dg * dg + db * db + da * da);
}
