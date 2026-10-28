import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyTheme,
  getInitialTheme,
  getSystemTheme,
  readStoredTheme,
  storeTheme,
  THEME_STORAGE_KEY,
} from './theme';

function stubSystemTheme(dark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: dark && query === '(prefers-color-scheme: dark)', media: query })),
  );
}

afterEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('stored theme', () => {
  it('is null until a theme is saved', () => {
    expect(readStoredTheme()).toBeNull();
    storeTheme('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(readStoredTheme()).toBe('dark');
  });

  it('ignores values that are not a theme', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'blue');
    expect(readStoredTheme()).toBeNull();
  });

  it('copes with storage being blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readStoredTheme()).toBeNull();
    expect(() => storeTheme('dark')).not.toThrow();
  });
});

describe('system theme', () => {
  it('follows the operating system preference', () => {
    stubSystemTheme(true);
    expect(getSystemTheme()).toBe('dark');
    stubSystemTheme(false);
    expect(getSystemTheme()).toBe('light');
  });

  it('falls back to light where the preference cannot be read', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(getSystemTheme()).toBe('light');
  });
});

describe('initial theme', () => {
  it('prefers the saved theme over the system one', () => {
    stubSystemTheme(true);
    expect(getInitialTheme()).toBe('dark');
    storeTheme('light');
    expect(getInitialTheme()).toBe('light');
  });
});

describe('applyTheme', () => {
  it('sets the theme on the document', () => {
    applyTheme('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    applyTheme('light');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });
});
