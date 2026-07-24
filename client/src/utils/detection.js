/**
 * Smart client-side Click & Detect algorithm
 * Analyzes local image pixels to estimate the bounding box of text or photo frames.
 */

// Helper to get luminance of a pixel
const getLuminance = (r, g, b) => {
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

// Helper to calculate variance of an array of numbers
const getVariance = (arr) => {
  const n = arr.length;
  if (n === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  return arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
};

/**
 * Estimates text or photo bounding box from a click coordinate.
 * @param {HTMLCanvasElement} canvas - HTML5 Canvas containing the original poster image
 * @param {number} clickX - X coordinate clicked (relative to original image size)
 * @param {number} clickY - Y coordinate clicked (relative to original image size)
 * @param {string} type - Type of placeholder ('name', 'role', or 'photo')
 * @returns {object} { x, y, width, height } Estimated bounding box
 */
export function detectPlaceholder(canvas, clickX, clickY, type) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // Safety boundaries
  clickX = Math.max(0, Math.min(width - 1, Math.round(clickX)));
  clickY = Math.max(0, Math.min(height - 1, Math.round(clickY)));

  if (type === 'name' || type === 'role') {
    // TEXT DETECTION ALGORITHM
    // 1. Scan vertically (up & down) from click coordinate to find top/bottom of the text line
    const scanWidth = Math.min(40, width);
    const halfScan = Math.floor(scanWidth / 2);
    const startX = Math.max(0, clickX - halfScan);
    const endX = Math.min(width, clickX + halfScan);
    const actualScanWidth = endX - startX;

    // Get pixel data in a vertical strip around clickX
    const stripHeight = Math.min(300, height); // scan up/down up to 150px
    const startY = Math.max(0, clickY - Math.floor(stripHeight / 2));
    const endY = Math.min(height, clickY + Math.floor(stripHeight / 2));
    const actualStripHeight = endY - startY;

    if (actualScanWidth <= 0 || actualStripHeight <= 0) {
      return getDefaultBox(clickX, clickY, type, width, height);
    }

    const imgData = ctx.getImageData(startX, startY, actualScanWidth, actualStripHeight);
    const data = imgData.data;

    // For each row in the strip, calculate contrast (variance of luminance)
    const rowContrasts = [];
    for (let py = 0; py < actualStripHeight; py++) {
      const rowLums = [];
      for (let px = 0; px < actualScanWidth; px++) {
        const idx = (py * actualScanWidth + px) * 4;
        rowLums.push(getLuminance(data[idx], data[idx + 1], data[idx + 2]));
      }
      rowContrasts.push(getVariance(rowLums));
    }

    // Index of the clicked Y coordinate inside the strip
    const clickedStripY = clickY - startY;

    // Find top boundary of the text line
    let topIdx = clickedStripY;
    let baselineContrast = 5; // minimum variance threshold for text stroke
    let consecutiveLow = 0;
    while (topIdx > 0) {
      if (rowContrasts[topIdx] < baselineContrast) {
        consecutiveLow++;
        if (consecutiveLow > 8) break; // found clear separation space
      } else {
        consecutiveLow = 0;
      }
      topIdx--;
    }
    topIdx += consecutiveLow; // adjust back

    // Find bottom boundary of the text line
    let bottomIdx = clickedStripY;
    consecutiveLow = 0;
    while (bottomIdx < actualStripHeight - 1) {
      if (rowContrasts[bottomIdx] < baselineContrast) {
        consecutiveLow++;
        if (consecutiveLow > 8) break; // found clear separation space
      } else {
        consecutiveLow = 0;
      }
      bottomIdx++;
    }
    bottomIdx -= consecutiveLow; // adjust back

    const textTop = startY + topIdx;
    const textBottom = startY + bottomIdx;
    let textHeight = textBottom - textTop;

    // If text height is invalid/too small, use default
    if (textHeight < 8) {
      textHeight = type === 'name' ? 50 : 30;
    }

    // 2. Scan horizontally (left & right) from clickX within the text row boundary
    // We get a wider row band of pixels
    const rowYStart = Math.max(0, textTop - 4);
    const rowYEnd = Math.min(height, textBottom + 4);
    const rowHeight = rowYEnd - rowYStart;
    
    const rowImgData = ctx.getImageData(0, rowYStart, width, rowHeight);
    const rData = rowImgData.data;

    // For each column in the image, calculate max contrast inside this vertical band
    const colContrasts = [];
    for (let px = 0; px < width; px++) {
      const colLums = [];
      for (let py = 0; py < rowHeight; py++) {
        const idx = (py * width + px) * 4;
        colLums.push(getLuminance(rData[idx], rData[idx + 1], rData[idx + 2]));
      }
      colContrasts.push(getVariance(colLums));
    }

    // Scan left from clickX
    let leftX = clickX;
    consecutiveLow = 0;
    while (leftX > 0) {
      if (colContrasts[leftX] < 3) {
        consecutiveLow++;
        if (consecutiveLow > 25) break; // blank margin found
      } else {
        consecutiveLow = 0;
      }
      leftX--;
    }
    leftX = Math.max(0, leftX + consecutiveLow);

    // Scan right from clickX
    let rightX = clickX;
    consecutiveLow = 0;
    while (rightX < width - 1) {
      if (colContrasts[rightX] < 3) {
        consecutiveLow++;
        if (consecutiveLow > 25) break; // blank margin found
      } else {
        consecutiveLow = 0;
      }
      rightX++;
    }
    rightX = Math.min(width, rightX - consecutiveLow);

    let textWidth = rightX - leftX;
    if (textWidth < 50) {
      textWidth = Math.min(400, width * 0.4);
      leftX = Math.max(0, clickX - textWidth / 2);
    }

    // Add some padding to width for aesthetic boundaries
    const paddedWidth = Math.min(width - leftX, textWidth + 20);

    return {
      x: Math.round(leftX),
      y: Math.round(textTop),
      width: Math.round(paddedWidth),
      height: Math.round(textHeight)
    };
  } else {
    // PHOTO DETECTION ALGORITHM
    // Photos typically are larger boxes, let's scan for color gradients/edges in 4 directions
    const scanLimit = Math.min(300, Math.floor(Math.min(width, height) / 2));
    
    // Helper to check for sharp color transition
    const getPixelColor = (x, y) => {
      const idx = (y * width + x) * 4;
      const data = ctx.getImageData(x, y, 1, 1).data;
      return [data[0], data[1], data[2]];
    };

    const colorDiff = (c1, c2) => {
      return Math.sqrt(
        Math.pow(c1[0] - c2[0], 2) +
        Math.pow(c1[1] - c2[1], 2) +
        Math.pow(c1[2] - c2[2], 2)
      );
    };

    const centerColor = getPixelColor(clickX, clickY);

    // Scan left
    let leftX = clickX;
    while (leftX > Math.max(0, clickX - scanLimit)) {
      const color = getPixelColor(leftX, clickY);
      if (colorDiff(centerColor, color) > 60) break; // edge hit
      leftX--;
    }

    // Scan right
    let rightX = clickX;
    while (rightX < Math.min(width - 1, clickX + scanLimit)) {
      const color = getPixelColor(rightX, clickY);
      if (colorDiff(centerColor, color) > 60) break; // edge hit
      rightX++;
    }

    // Scan up
    let topY = clickY;
    while (topY > Math.max(0, clickY - scanLimit)) {
      const color = getPixelColor(clickX, topY);
      if (colorDiff(centerColor, color) > 60) break; // edge hit
      topY--;
    }

    // Scan down
    let bottomY = clickY;
    while (bottomY < Math.min(height - 1, clickY + scanLimit)) {
      const color = getPixelColor(clickX, bottomY);
      if (colorDiff(centerColor, color) > 60) break; // edge hit
      bottomY++;
    }

    let w = rightX - leftX;
    let h = bottomY - topY;

    // If edges are too tight or didn't detect properly, fall back to standard proportions
    if (w < 80 || h < 100) {
      w = Math.min(300, Math.round(width * 0.3));
      h = Math.round(w * 1.3); // 3:4 aspect ratio
      leftX = clickX - w / 2;
      topY = clickY - h / 2;
    }

    return {
      x: Math.max(0, Math.round(leftX)),
      y: Math.max(0, Math.round(topY)),
      width: Math.round(w),
      height: Math.round(h)
    };
  }
}

function getDefaultBox(clickX, clickY, type, imgW, imgH) {
  if (type === 'photo') {
    const w = Math.min(320, Math.round(imgW * 0.3));
    const h = Math.round(w * 1.35);
    return {
      x: Math.max(0, Math.round(clickX - w / 2)),
      y: Math.max(0, Math.round(clickY - h / 2)),
      width: w,
      height: h
    };
  } else if (type === 'name') {
    const w = Math.min(450, Math.round(imgW * 0.45));
    const h = 60;
    return {
      x: Math.max(0, Math.round(clickX - w / 2)),
      y: Math.max(0, Math.round(clickY - h / 2)),
      width: w,
      height: h
    };
  } else { // role
    const w = Math.min(350, Math.round(imgW * 0.35));
    const h = 40;
    return {
      x: Math.max(0, Math.round(clickX - w / 2)),
      y: Math.max(0, Math.round(clickY - h / 2)),
      width: w,
      height: h
    };
  }
}
