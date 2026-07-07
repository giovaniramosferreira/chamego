import { describe, expect, it } from 'vitest';
import { REAL_APP_REGISTRY, REAL_APP_API_PATHS } from './realScreens.jsx';

describe('real app screen registry', () => {
  it('covers the authenticated app screens with API-backed components', () => {
    for (const id of [
      'home-root', 'agenda-root', 'event-create', 'listas-root', 'list-detail',
      'momentos-root', 'moment-add', 'voces-root', 'chat', 'config-hub',
      'planos-root', 'presentes-root', 'date-hub', 'resumo-semanal',
      'lembretes-root', 'quiz-root', 'conquistas-root', 'capsula-root',
      'album-root', 'intimidade-root', 'paywall',
    ]) {
      expect(REAL_APP_REGISTRY[id]?.component).toBeTypeOf('function');
    }
  });

  it('declares the backend endpoints used by the authenticated registry', () => {
    expect(REAL_APP_API_PATHS).toContain('/api/plans');
    expect(REAL_APP_API_PATHS).toContain('/api/gifts');
    expect(REAL_APP_API_PATHS).toContain('/api/date-ideas');
    expect(REAL_APP_API_PATHS).toContain('/api/weekly-summary');
    expect(REAL_APP_API_PATHS).toContain('/api/subscription');
  });
});
