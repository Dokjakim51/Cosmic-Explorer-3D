import { appStore } from '../store/app-store.js';
import { catalogEs } from './catalog-es.js';
import { translations } from './translations.js';

export const supportedLanguages = ['en', 'es'];

export function normalizeLanguage(value) {
  return String(value || '').toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function getLanguage() {
  return normalizeLanguage(appStore.getState().language);
}

function applyPluralTemplate(value, variables) {
  return value.replace(/\{(\w+),\s*plural,\s*one\s*\{([^{}]*)\}\s*other\s*\{([^{}]*)\}\}/g, (_, key, one, other) => {
    return Number(variables[key]) === 1 ? one : other;
  });
}

function applyVariables(value, variables) {
  return value.replace(/\{(\w+)\}/g, (match, key) => (
    Object.prototype.hasOwnProperty.call(variables, key) ? String(variables[key]) : match
  ));
}

export function t(key, variables = {}, language = getLanguage()) {
  const selected = translations[normalizeLanguage(language)] || translations.en;
  const fallback = translations.en;
  const raw = selected[key] ?? fallback[key] ?? key;
  return applyVariables(applyPluralTemplate(String(raw), variables), variables);
}

function mergeDeep(base, override) {
  if (!override || typeof override !== 'object' || Array.isArray(override)) return override ?? base;
  const output = { ...base };
  for (const [key, value] of Object.entries(override)) {
    output[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? mergeDeep(base?.[key] || {}, value)
      : value;
  }
  return output;
}

export function localizeCelestial(item, kind, language = getLanguage()) {
  const normalized = normalizeLanguage(language);
  if (normalized === 'en') {
    return {
      ...item,
      searchAliases: [item.name, item.type, item.constellation, item.shortDescription].filter(Boolean)
    };
  }
  const collection = kind === 'star' ? catalogEs.stars : catalogEs.planets;
  const localized = mergeDeep(item, collection[item.id]);
  return {
    ...localized,
    searchAliases: [
      item.name,
      item.type,
      item.constellation,
      item.shortDescription,
      localized.name,
      localized.type,
      localized.constellation,
      localized.shortDescription
    ].filter(Boolean)
  };
}

export function localizeCatalog(items, kind, language = getLanguage()) {
  return items.map((item) => localizeCelestial(item, kind, language));
}

function updateStaticLanguageText() {
  const skipLink = document.querySelector('.skip-link');
  if (skipLink) skipLink.textContent = t('accessibility.skip');
  const description = document.querySelector('meta[name="description"]');
  const openGraphDescription = document.querySelector('meta[property="og:description"]');
  if (description) description.setAttribute('content', t('meta.description'));
  if (openGraphDescription) openGraphDescription.setAttribute('content', t('meta.ogDescription'));
}

export function setLanguage(language) {
  const normalized = normalizeLanguage(language);
  if (normalized === getLanguage()) return;
  appStore.setState({ language: normalized });
  document.documentElement.lang = normalized;
  updateStaticLanguageText();
  window.dispatchEvent(new CustomEvent('cosmic-explorer:language-change', { detail: { language: normalized } }));
}

export function toggleLanguage() {
  setLanguage(getLanguage() === 'en' ? 'es' : 'en');
}

export function initializeLanguage() {
  const language = getLanguage();
  document.documentElement.lang = language;
  updateStaticLanguageText();
  return language;
}
