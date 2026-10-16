export function createSectionHeading({ eyebrow, title, description }) {
  const wrapper = document.createElement('header');
  wrapper.className = 'section-heading';

  if (eyebrow) {
    const eyebrowNode = document.createElement('p');
    eyebrowNode.className = 'eyebrow';
    eyebrowNode.textContent = eyebrow;
    wrapper.append(eyebrowNode);
  }

  const titleNode = document.createElement('h1');
  titleNode.textContent = title;
  wrapper.append(titleNode);

  if (description) {
    const descriptionNode = document.createElement('p');
    descriptionNode.className = 'section-description';
    descriptionNode.textContent = description;
    wrapper.append(descriptionNode);
  }

  return wrapper;
}
