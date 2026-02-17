/**
 * Map export module.
 * Captures the current map view as PNG or opens a print-friendly page for PDF.
 */

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function captureMap(getMapFn) {
  const map = getMapFn();
  if (!map) {
    alert('Map is not loaded yet.');
    return null;
  }
  try {
    return map.getCanvas().toDataURL('image/png');
  } catch (err) {
    alert('Could not capture map: ' + err.message);
    return null;
  }
}

function exportPNG(getMapFn) {
  const dataUrl = captureMap(getMapFn);
  if (!dataUrl) return;

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `natura-map-export-${timestamp()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function exportPDF(getMapFn) {
  const dataUrl = captureMap(getMapFn);
  if (!dataUrl) return;

  const legendEl = document.getElementById('legend-content');
  const legendHTML = legendEl ? legendEl.innerHTML : '';
  const dateStr = new Date().toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>natura-map export</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #1a1a1a; }
  h1 { font-size: 1.4rem; margin-bottom: 4px; }
  .date { font-size: 0.85rem; color: #666; margin-bottom: 16px; }
  img { max-width: 100%; border: 1px solid #ddd; border-radius: 4px; }
  .legend { margin-top: 20px; }
  .legend h2 { font-size: 1rem; margin-bottom: 8px; }
  @media print {
    body { padding: 0; }
    img { max-height: 80vh; object-fit: contain; }
  }
</style>
</head>
<body>
  <h1>natura-map export</h1>
  <p class="date">${dateStr}</p>
  <img src="${dataUrl}" alt="Map export">
  <div class="legend">
    <h2>Legend</h2>
    ${legendHTML}
  </div>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Pop-up blocked. Please allow pop-ups for this site.');
    return;
  }
  win.document.write(html);
  win.document.close();
}

/**
 * Initialize export buttons.
 * @param {Function} getMapFn - Returns the MapLibre map instance.
 */
export function initExport(getMapFn) {
  const pngBtn = document.getElementById('export-png');
  const pdfBtn = document.getElementById('export-pdf');

  if (pngBtn) pngBtn.addEventListener('click', () => exportPNG(getMapFn));
  if (pdfBtn) pdfBtn.addEventListener('click', () => exportPDF(getMapFn));
}
