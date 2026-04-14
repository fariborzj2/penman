/**
 * STRICT REQUIREMENT: No innerHTML allowed. Nodes must be constructed directly.
 *
 * DOM Structure (MANDATORY):
 * <figure class="penman-image" data-alignment="center" contenteditable="false">
 *   <div class="penman-image-wrapper">
 *     <img src="..." alt="..." data-id="..." />
 *   </div>
 *   <figcaption class="penman-image-caption" contenteditable="true" data-placeholder="Enter caption...">Optional Caption</figcaption>
 * </figure>
 */

export function createFigureNode(src, alt = '', dataId = null, alignment = 'center') {
  const figure = document.createElement('figure');
  figure.className = 'penman-image';
  figure.setAttribute('data-alignment', alignment);
  figure.setAttribute('contenteditable', 'false');

  const wrapper = document.createElement('div');
  wrapper.className = 'penman-image-wrapper';

  const img = document.createElement('img');
  img.setAttribute('src', src);
  if (alt) {
    img.setAttribute('alt', alt);
  }
  if (dataId) {
    img.setAttribute('data-id', dataId);
  }

  const figcaption = document.createElement('figcaption');
  figcaption.className = 'penman-image-caption';
  figcaption.setAttribute('contenteditable', 'true');
  figcaption.setAttribute('data-placeholder', 'Enter caption...');
  // Optional caption text starts empty as per spec? No, actually placeholder is enough

  wrapper.appendChild(img);
  figure.appendChild(wrapper);
  figure.appendChild(figcaption);

  return figure;
}
