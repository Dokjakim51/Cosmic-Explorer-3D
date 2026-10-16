import { getIcon } from '../../components/ui/icons.js';
import { t } from '../../i18n/i18n.js';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function scoreItem(item, query) {
  const name = normalize(item.name);
  const type = normalize(item.type || item.spectralType);
  const constellation = normalize(item.constellation);
  const description = normalize(item.shortDescription);
  const aliases = (item.searchAliases || []).map(normalize).join(' ');
  if (name === query) return 100;
  if (name.startsWith(query)) return 80;
  if (name.includes(query)) return 60;
  if (type.includes(query)) return 35;
  if (constellation.includes(query)) return 30;
  if (description.includes(query)) return 20;
  if (aliases.includes(query)) return 15;
  return 0;
}

function highlight(text, query) {
  if (!query) return escapeHtml(text);
  const source = String(text);
  const normalizedSource = normalize(source);
  const index = normalizedSource.indexOf(query);
  if (index < 0) return escapeHtml(source);
  const before = escapeHtml(source.slice(0, index));
  const match = escapeHtml(source.slice(index, index + query.length));
  const after = escapeHtml(source.slice(index + query.length));
  return `${before}<mark>${match}</mark>${after}`;
}

export function createCosmicSearch({ planets, stars, onSelect }) {
  const items = [
    ...planets.map((item) => ({ ...item, searchKind: 'planet' })),
    ...stars.map((item) => ({ ...item, searchKind: 'star' }))
  ];
  let results = [];
  let activeIndex = -1;

  const root = document.createElement('section');
  root.className = 'cosmic-search glass-card';
  root.setAttribute('aria-labelledby', 'cosmic-search-title');
  root.dataset.reveal = '';
  root.innerHTML = `
    <div class="cosmic-search-copy">
      <span class="cosmic-search-icon" aria-hidden="true">${getIcon('sparkle')}</span>
      <div>
        <p class="eyebrow">${t('search.eyebrow')}</p>
        <h2 id="cosmic-search-title">${t('search.title')}</h2>
        <p>${t('search.description')}</p>
      </div>
    </div>
    <div class="cosmic-search-field">
      <label class="sr-only" for="cosmic-search-input">${t('search.label')}</label>
      <span class="cosmic-search-magnifier" aria-hidden="true">⌕</span>
      <input id="cosmic-search-input" type="search" autocomplete="off" spellcheck="false" placeholder="${t('search.placeholder')}" aria-autocomplete="list" aria-controls="cosmic-search-results" aria-expanded="false">
      <button class="cosmic-search-clear" type="button" aria-label="${t('search.clear')}" hidden>${getIcon('close')}</button>
      <div id="cosmic-search-results" class="cosmic-search-results" role="listbox" hidden></div>
    </div>
  `;

  const input = root.querySelector('input');
  const listbox = root.querySelector('[role="listbox"]');
  const clearButton = root.querySelector('.cosmic-search-clear');

  function closeResults() {
    results = [];
    activeIndex = -1;
    listbox.hidden = true;
    listbox.replaceChildren();
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  function setActive(index) {
    if (!results.length) return;
    activeIndex = (index + results.length) % results.length;
    listbox.querySelectorAll('[role="option"]').forEach((option, optionIndex) => {
      const active = optionIndex === activeIndex;
      option.classList.toggle('is-active', active);
      option.setAttribute('aria-selected', String(active));
      if (active) {
        input.setAttribute('aria-activedescendant', option.id);
        option.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function select(item) {
    input.value = item.name;
    clearButton.hidden = false;
    closeResults();
    onSelect?.(item);
  }

  function renderResults(query) {
    const normalizedQuery = normalize(query);
    clearButton.hidden = !query;
    if (!normalizedQuery) {
      closeResults();
      return;
    }

    results = items
      .map((item) => ({ item, score: scoreItem(item, normalizedQuery) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
      .slice(0, 8)
      .map(({ item }) => item);
    activeIndex = -1;

    if (!results.length) {
      listbox.hidden = false;
      listbox.innerHTML = `
        <div class="cosmic-search-empty" role="status">
          <span aria-hidden="true">✦</span>
          <p>${t('search.empty', { query: escapeHtml(query) })}</p>
        </div>
      `;
      input.setAttribute('aria-expanded', 'true');
      return;
    }

    listbox.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    listbox.innerHTML = results.map((item, index) => `
      <button id="cosmic-search-option-${index}" class="cosmic-search-result" type="button" role="option" aria-selected="false" data-result-index="${index}">
        <span class="cosmic-search-result-visual cosmic-search-result-visual--${item.searchKind}" style="--accent:${item.accentColor}" aria-hidden="true"></span>
        <span class="cosmic-search-result-copy">
          <strong>${highlight(item.name, normalizedQuery)}</strong>
          <small>${item.searchKind === 'planet' ? item.type : `${item.spectralType} · ${item.constellation}`}</small>
        </span>
        <span class="cosmic-search-kind">${t(`search.kind.${item.searchKind}`)}</span>
        ${getIcon('arrow')}
      </button>
    `).join('');
  }

  const onInput = () => renderResults(input.value);
  const onKeydown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (listbox.hidden) renderResults(input.value);
      setActive(activeIndex + 1);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(activeIndex - 1);
    }
    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      select(results[activeIndex]);
    }
    if (event.key === 'Escape') closeResults();
  };
  const onListClick = (event) => {
    const button = event.target.closest('[data-result-index]');
    if (!button) return;
    select(results[Number(button.dataset.resultIndex)]);
  };
  const onClear = () => {
    input.value = '';
    clearButton.hidden = true;
    closeResults();
    input.focus();
  };
  const onDocumentPointer = (event) => {
    if (!root.contains(event.target)) closeResults();
  };

  input.addEventListener('input', onInput);
  input.addEventListener('keydown', onKeydown);
  input.addEventListener('focus', () => {
    if (input.value) renderResults(input.value);
  });
  listbox.addEventListener('click', onListClick);
  clearButton.addEventListener('click', onClear);
  document.addEventListener('pointerdown', onDocumentPointer);

  return {
    element: root,
    focus() {
      input.focus();
    },
    destroy() {
      input.removeEventListener('input', onInput);
      input.removeEventListener('keydown', onKeydown);
      listbox.removeEventListener('click', onListClick);
      clearButton.removeEventListener('click', onClear);
      document.removeEventListener('pointerdown', onDocumentPointer);
    }
  };
}
