import { describe, expect, it } from 'vitest';
import { screenPath } from './nav.jsx';

describe('screenPath', () => {
  it('builds screen URLs for the configured app base path', () => {
    expect(screenPath('/app', 'home-root')).toBe('/app/home-root');
    expect(screenPath('/app/', 'momentos-root')).toBe('/app/momentos-root');
  });

  it('keeps the prototype route available', () => {
    expect(screenPath('/prototipo', 'agenda-root')).toBe('/prototipo/agenda-root');
  });
});
