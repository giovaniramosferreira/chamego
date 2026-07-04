// Line icons 24x24, stroke 1.8 — portados de design_handoff_chamego/js/core.js
const PATHS = {
  home: <><path d="M3 11l9-7 9 7" /><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1.4" /><circle cx="3.5" cy="12" r="1.4" /><circle cx="3.5" cy="18" r="1.4" /></>,
  moments: <><rect x="3" y="4" width="18" height="15" rx="2" /><circle cx="8.5" cy="10" r="1.7" /><path d="M21 16l-5-5-6 6-2-2-4 4" /></>,
  together: <><circle cx="9" cy="9" r="3.2" /><circle cx="16" cy="10.5" r="2.6" /><path d="M3.5 19c.6-3 2.6-4.6 5.5-4.6s4.9 1.6 5.5 4.6M14.5 19c.4-2 1.6-3.4 3.2-3.9" /></>,
  back: <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />,
  close: <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />,
  bell: <><path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10z" /><path d="M10 19a2 2 0 0 0 4 0" /></>,
  plus: <path d="M12 5v14M5 12h14" strokeLinecap="round" />,
  check: <path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />,
  chevronR: <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />,
  heart: <path d="M12 20s-7-4.4-9.4-8.7C1 8 2.6 5 5.6 5c1.9 0 3.2 1.1 4 2.3.8-1.2 2.1-2.3 4-2.3 3 0 4.6 3 3 6.3C19 15.6 12 20 12 20z" />,
  image: <><rect x="3" y="4" width="18" height="15" rx="2" /><circle cx="8.5" cy="10" r="1.7" /><path d="M21 16l-5-5-6 6-2-2-4 4" /></>,
  chat: <path d="M4 5h16v11H9l-4 3.5V16H4z" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.5a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.6 2 3.4 2.3-.9c.6.5 1.3.9 2 1.2L10 21h4l.6-2.5c.7-.3 1.4-.7 2-1.2l2.3.9 2-3.4-2-1.6c.07-.4.1-.8.1-1.2z" /></>,
  user: <><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20c1-4 4-5.8 7.5-5.8s6.5 1.8 7.5 5.8" /></>,
  link: <><path d="M9 15l6-6" /><path d="M13 6l1-1a4 4 0 0 1 5.7 5.7l-1.5 1.5" /><path d="M11 18l-1 1A4 4 0 0 1 4.3 13.3l1.5-1.5" /></>,
  whatsapp: <path d="M6 18l-2 1 .6-2.4A7.5 7.5 0 1 1 9.5 19a7.4 7.4 0 0 1-3.5-.9z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 6.5l9 6 9-6" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  camera: <><path d="M4 8h3l2-2h6l2 2h3v11H4z" /><circle cx="12" cy="13.5" r="3.4" /></>,
  edit: <path d="M4 20l1-4L16 5l3 3L8 19l-4 1z" />,
  trash: <path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M20 20l-4.8-4.8" strokeLinecap="round" /></>,
  star: <path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L12 16.9l-5.6 3.1 1.4-6.2L3 9.5l6.4-.6z" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3z" /></>,
  shield: <path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z" />,
  logout: <path d="M15 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h9M10 12h11m0 0-4-4m4 4-4 4" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  pin: <><path d="M12 21s-6-5.4-6-10a6 6 0 0 1 12 0c0 4.6-6 10-6 10z" /><circle cx="12" cy="11" r="2.2" /></>,
  google: <><path d="M21 12.2c0-.7-.1-1.4-.2-2H12v3.9h5c-.2 1.2-.9 2.1-1.9 2.8v2.3h3.1c1.8-1.7 2.8-4.1 2.8-7z" /><path d="M12 21c2.4 0 4.5-.8 6-2.2l-3.1-2.3c-.8.6-1.9.9-2.9.9-2.3 0-4.2-1.5-4.9-3.6H3.9v2.3A9 9 0 0 0 12 21z" /><path d="M7.1 13.8a5.4 5.4 0 0 1 0-3.6V7.9H3.9a9 9 0 0 0 0 8.2z" /><path d="M12 6.6c1.3 0 2.5.5 3.4 1.3l2.5-2.5A8.7 8.7 0 0 0 12 3a9 9 0 0 0-8.1 4.9l3.2 2.3c.7-2.1 2.6-3.6 4.9-3.6z" /></>,
};

export default function Icon({ name, size = 20, className = '', stroke }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke || 'currentColor'}
      strokeWidth="1.8" className={className} aria-hidden="true">
      {PATHS[name] || null}
    </svg>
  );
}
