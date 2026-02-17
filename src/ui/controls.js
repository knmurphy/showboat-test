/**
 * Layer type toggle and controls.
 */

/**
 * Initialize layer toggle buttons.
 * @param {Function} onLayerChange - Called with layer type string when toggled
 * @param {Function} onColorByChange - Called with new colorBy property
 */
export function initControls(onLayerChange, onColorByChange) {
  const buttons = document.querySelectorAll('.layer-btn');
  const colorBySelect = document.getElementById('color-by');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onLayerChange(btn.dataset.layer);
    });
  });

  colorBySelect.addEventListener('change', () => {
    onColorByChange(colorBySelect.value);
  });
}

/**
 * Get the currently selected layer type.
 */
export function getActiveLayerType() {
  const active = document.querySelector('.layer-btn.active');
  return active ? active.dataset.layer : 'points';
}

/**
 * Get the currently selected colorBy property.
 */
export function getActiveColorBy() {
  return document.getElementById('color-by').value;
}

/**
 * Initialize palette selector dropdown.
 * @param {Function} onPaletteChange - Called with palette name when changed
 */
export function initPaletteControl(onPaletteChange) {
  const paletteSelect = document.getElementById('palette-select');
  if (!paletteSelect) return;
  paletteSelect.addEventListener('change', () => {
    onPaletteChange(paletteSelect.value);
  });
}
