export function createLogo({ compact = false } = {}) {
  const wrapper = document.createElement('span');
  wrapper.className = compact ? 'logo logo--compact' : 'logo';

  const image = document.createElement('img');
  image.src = './public/icons/cosmic-explorer-mark.svg';
  image.alt = '';
  image.width = compact ? 34 : 42;
  image.height = compact ? 34 : 42;

  const wordmark = document.createElement('span');
  wordmark.className = 'logo-wordmark';
  wordmark.textContent = 'COSMIC_EXPLORER';

  wrapper.append(image, wordmark);
  return wrapper;
}
