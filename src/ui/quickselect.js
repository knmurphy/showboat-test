/**
 * Quick-select preset buttons.
 * Pre-configured queries that users can click to instantly load data.
 */

const PRESETS = [
  {
    label: 'Fungi of California',
    params: {
      taxonName: 'Fungi',
      taxonId: 47170,
      placeName: 'California',
      placeId: 14,
      qualityGrade: 'research'
    }
  },
  {
    label: 'Birds of Costa Rica',
    params: {
      taxonName: 'Aves',
      taxonId: 3,
      placeName: 'Costa Rica',
      placeId: 6924,
      qualityGrade: 'research'
    }
  },
  {
    label: 'Reptiles of Australia',
    params: {
      taxonName: 'Reptilia',
      taxonId: 26036,
      placeName: 'Australia',
      placeId: 6744,
      qualityGrade: 'research'
    }
  },
  {
    label: 'Mushrooms of NE US',
    params: {
      taxonName: 'Agaricomycetes',
      taxonId: 47169,
      placeName: 'New England',
      placeId: 52295,
      qualityGrade: 'research'
    }
  },
  {
    label: 'Orchids Worldwide',
    params: {
      taxonName: 'Orchidaceae',
      taxonId: 47217,
      placeName: '',
      placeId: null,
      qualityGrade: 'research'
    }
  }
  ,
  {
    label: 'Wildflowers of Pacific NW',
    params: {
      taxonName: 'Angiospermae',
      taxonId: 47125,
      placeName: 'Pacific Northwest',
      placeId: 52771,
      qualityGrade: 'research'
    }
  },
  {
    label: 'Mammals of East Africa',
    params: {
      taxonName: 'Mammalia',
      taxonId: 40151,
      placeName: 'Kenya',
      placeId: 6878,
      qualityGrade: 'research'
    }
  },
  {
    label: 'Butterflies of Europe',
    params: {
      taxonName: 'Papilionoidea',
      taxonId: 47224,
      placeName: 'Europe',
      placeId: 97391,
      qualityGrade: 'research'
    }
  },
  {
    label: 'Marine Life of Hawaii',
    params: {
      taxonName: 'Animalia',
      taxonId: 1,
      placeName: 'Hawaii',
      placeId: 8,
      qualityGrade: 'research'
    }
  }
];

/**
 * Initialize quick-select buttons.
 * @param {Function} onSelect - Called with preset params when a button is clicked
 */
export function initQuickSelect(onSelect) {
  const container = document.getElementById('preset-buttons');
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  for (const preset of PRESETS) {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.textContent = preset.label;
    btn.addEventListener('click', () => {
      container.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onSelect(preset.params);
    });
    container.appendChild(btn);
  }
}
