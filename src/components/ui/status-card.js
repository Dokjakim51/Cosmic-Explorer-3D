import { getIcon } from './icons.js';

function activateCard(card, link) {
  if (!link) return;
  const navigate = () => {
    window.location.hash = `#${link}`;
  };
  card.tabIndex = 0;
  card.setAttribute('role', 'link');
  card.classList.add('status-card--interactive');
  card.addEventListener('click', (event) => {
    if (event.target.closest('a, button, input, select, textarea, label')) return;
    navigate();
  });
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigate();
    }
  });
}

export function createStatusCard({ icon = 'sparkle', title, description, link, linkLabel = 'Open section' }) {
  const card = document.createElement('article');
  card.className = 'glass-card status-card';
  card.dataset.reveal = '';

  const iconNode = document.createElement('span');
  iconNode.className = 'status-card-icon';
  iconNode.setAttribute('aria-hidden', 'true');
  iconNode.innerHTML = getIcon(icon);

  const body = document.createElement('div');
  body.className = 'status-card-body';
  const heading = document.createElement('h2');
  heading.textContent = title;
  const text = document.createElement('p');
  text.textContent = description;
  body.append(heading, text);

  if (link) {
    const action = document.createElement('a');
    action.className = 'card-arrow';
    action.href = `#${link}`;
    action.setAttribute('aria-label', linkLabel);
    action.innerHTML = getIcon('arrow');
    body.append(action);
  }

  card.append(iconNode, body);
  activateCard(card, link);
  return card;
}
