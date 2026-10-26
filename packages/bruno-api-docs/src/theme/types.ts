export type ThemeFamily = 'default' | 'backstage';
export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedThemeMode = Exclude<ThemeMode, 'system'>;
export type ThemeState = {
  family: ThemeFamily;
  mode: ThemeMode;
};

export interface Theme {
  mode: ResolvedThemeMode;
  brand: string;
  text: string;
  textLink: string;
  draftColor: string;
  bg: string;
  primary: Record<string, string>;
  background: Record<string, string>;
  status: Record<string, { background: string; text: string; border: string }>;
  font: { size: Record<string, string> };
  border: { radius: Record<string, string>; [k: string]: unknown };
  colors: { text: Record<string, string>; [k: string]: unknown };
  input: Record<string, unknown>;
  sidebar: Record<string, unknown>;
  request: { methods: Record<string, string>; [k: string]: unknown };
  codemirror: Record<string, unknown>;
  table: Record<string, unknown>;
  [section: string]: unknown;
}
