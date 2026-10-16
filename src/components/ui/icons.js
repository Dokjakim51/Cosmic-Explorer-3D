const icons = {
  telescope: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5.5 4-2 2 4-4 2-2-4Z"/><path d="m4 14 10-5 2 4-10 5-2-4Z"/><path d="m9 16-2 5M13 14l3 7M5 17h12"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>`,
  music: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>`,
  galaxy: `<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="12" rx="10" ry="5"/><ellipse cx="12" cy="12" rx="5" ry="10" transform="rotate(45 12 12)"/><circle cx="12" cy="12" r="1.5"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
  sparkle: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2Z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"/></svg>`,
  game: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7h8a5 5 0 0 1 4.8 6.4l-1 3.5a2.5 2.5 0 0 1-4.2 1.1l-1.5-1.5H9.9L8.4 18a2.5 2.5 0 0 1-4.2-1.1l-1-3.5A5 5 0 0 1 8 7Z"/><path d="M8 11v4M6 13h4M16 12h.01M18 14h.01"/></svg>`,
  star: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3 6.2 6.8 1-4.9 4.8 1.2 6.8L12 17.6l-6.1 3.2 1.2-6.8-4.9-4.8 6.8-1L12 2Z"/></svg>`,
  close: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>`,
  zoomIn: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M11 8v6M8 11h6"/></svg>`,
  zoomOut: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M8 11h6"/></svg>`,
  reset: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>`,
  play: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z"/></svg>`,
  chevronLeft: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>`,
  chevronRight: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`,
  info: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>`,
  upload: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 15v4h14v-4"/></svg>`,
  previous: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14M18 6l-9 6 9 6V6Z"/></svg>`,
  next: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5v14M6 6l9 6-9 6V6Z"/></svg>`,
  shuffle: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h3c4 0 5 10 9 10h6"/><path d="m18 14 3 3-3 3"/><path d="M3 17h3c1.7 0 2.8-1.8 4-4"/><path d="M14 7h7M18 4l3 3-3 3"/></svg>`,
  repeat: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>`,
  volume: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a8 8 0 0 1 0 11"/></svg>`,
  volumeOff: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m16 10 5 5M21 10l-5 5"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>`,
  search: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>`,
  expand: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>`,
  external: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M13 11l6-6"/><path d="M19 13v6H5V5h6"/></svg>`,
  list: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>`
};

export function getIcon(name, className = '') {
  const markup = icons[name] ?? icons.sparkle;
  return markup.replace('<svg ', `<svg class="${className}" `);
}
