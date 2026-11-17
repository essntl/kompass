import { describe, expect, it } from 'vitest';
import {
  activeBottomPath,
  BOTTOM_NAV,
  FUTURE_NAV,
  MORE_NAV,
  SETTINGS_NAV,
  SIDEBAR_PRIMARY_NAV,
} from './navigation';

describe('navigation', () => {
  it('keeps five items in the bottom nav', () => {
    expect(BOTTOM_NAV.map((item) => item.label)).toEqual(['Hjem', 'Timeplan', 'Reise', 'Meldinger', 'Mer']);
  });

  it('puts Vurderinger after Meldinger in the sidebar and first on the "Mer" page', () => {
    expect(SIDEBAR_PRIMARY_NAV.map((item) => item.path)).toEqual([
      '/',
      '/timeplan',
      '/reise',
      '/meldinger',
      '/vurderinger',
    ]);
    expect(MORE_NAV[0]).toMatchObject({ path: '/vurderinger', label: 'Vurderinger' });
    expect(MORE_NAV.every((item) => item.description)).toBe(true);
  });

  it('lists every destination once in the sidebar, each with its own icon', () => {
    const sidebar = [...SIDEBAR_PRIMARY_NAV, ...FUTURE_NAV, SETTINGS_NAV];
    expect(sidebar).toHaveLength(9);
    expect(new Set(sidebar.map((item) => item.path)).size).toBe(9);
    expect(new Set(sidebar.map((item) => item.icon)).size).toBe(9);
  });

  it('highlights "Mer" on mobile for Vurderinger and its detail pages', () => {
    expect(activeBottomPath('/vurderinger')).toBe('/mer');
    expect(activeBottomPath('/vurderinger/a-matte-likninger')).toBe('/mer');
    expect(activeBottomPath('/meldinger/th-amir')).toBe('/meldinger');
  });
});
