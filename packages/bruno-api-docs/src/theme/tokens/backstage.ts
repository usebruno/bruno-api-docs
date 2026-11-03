import { merge } from 'lodash-es';
import type { ResolvedThemeMode, Theme } from '@/theme/types';
import { light } from './light';
import { dark } from './dark';

interface BackstagePalette {
  background: {
    paper: string;
    default: string;
    bright: string;
    crust: string;
    surface0: string;
    surface1: string;
    surface2: string;
  };
  text: { primary: string; subtle: string; muted: string; disabled: string };
  border: { strong: string; base: string; subtle: string };
  link: string;
  status: { ok: string; warning: string; error: string; info: string };
  hues: Record<'purple' | 'pink' | 'teal' | 'cyan' | 'indigo' | 'rose' | 'brown' | 'yellow', string>;
}

const backstageLightPalette: BackstagePalette = {
  background: {
    paper: '#F5F5F5',
    default: '#F0F0F0',
    bright: '#FAFAFA',
    crust: '#F5F5F5',
    surface0: '#F0F0F0',
    surface1: '#E8E8E8',
    surface2: '#E0E0E0'
  },
  text: { primary: '#212121', subtle: '#6E6E6E', muted: '#757575', disabled: '#9E9E9E' },
  border: { strong: '#C4C4C4', base: '#E6E6E6', subtle: '#F0F0F0' },
  link: '#0A6EBE',
  status: { ok: '#2E7D32', warning: '#E65100', error: '#E22134', info: '#2E77D0' },
  hues: {
    purple: '#7B1FA2',
    pink: '#C2185B',
    teal: '#00796B',
    cyan: '#0097A7',
    indigo: '#303F9F',
    rose: '#AD1457',
    brown: '#5D4037',
    yellow: '#F9A825'
  }
};

const backstageDarkPalette: BackstagePalette = {
  background: {
    paper: '#333333',
    default: '#424242',
    bright: '#4A4A4A',
    crust: '#3A3A3A',
    surface0: '#4A4A4A',
    surface1: '#525252',
    surface2: '#616161'
  },
  text: { primary: '#FFFFFF', subtle: '#CCCCCC', muted: '#B5B5B5', disabled: '#9E9E9E' },
  border: { strong: '#757575', base: '#5A5A5A', subtle: '#4D4D4D' },
  link: '#9CC9FF',
  status: { ok: '#71CF88', warning: '#FFB84D', error: '#F84C55', info: '#9CC9FF' },
  hues: {
    purple: '#CE93D8',
    pink: '#FF88B2',
    teal: '#80CBC4',
    cyan: '#80DEEA',
    indigo: '#9FA8DA',
    rose: '#F48FB1',
    brown: '#BCAAA4',
    yellow: '#FEF071'
  }
};

const statusColors = (color: string) => ({
  background: `color-mix(in srgb, ${color} 15%, transparent)`,
  text: color,
  border: color
});

const createBackstageTheme = (base: Theme, mode: ResolvedThemeMode, p: BackstagePalette): Theme => merge({}, base, {
  mode,
  text: p.text.primary,
  textLink: p.link,
  draftColor: p.status.warning,
  bg: p.background.paper,

  background: {
    base: p.background.paper,
    mantle: p.background.default,
    crust: p.background.crust,
    surface0: p.background.surface0,
    surface1: p.background.surface1,
    surface2: p.background.surface2,
    surfaceBright: p.background.bright
  },

  status: {
    info: statusColors(p.status.info),
    success: statusColors(p.status.ok),
    warning: statusColors(p.status.warning),
    danger: statusColors(p.status.error)
  },

  overlay: {
    overlay2: p.text.muted,
    overlay1: p.text.disabled,
    overlay0: p.border.strong
  },

  border: {
    border2: p.border.strong,
    border1: p.border.base,
    border0: p.border.subtle
  },

  colors: {
    text: {
      green: p.status.ok,
      danger: p.status.error,
      warning: p.status.warning,
      muted: p.text.muted,
      purple: p.hues.purple,
      yellow: p.hues.yellow,
      subtext2: p.text.subtle,
      subtext1: p.text.muted,
      subtext0: p.text.disabled
    },
    bg: {
      danger: p.status.error
    }
  },

  input: {
    bg: p.background.paper,
    border: p.border.strong
  },

  checkbox: {
    border: p.border.strong
  },

  sidebar: {
    color: p.text.primary,
    muted: p.text.muted,
    bg: p.background.default,
    collection: {
      item: {
        bg: p.background.surface1,
        hoverBg: p.background.surface1,
        focusBorder: p.border.strong,
        indentBorder: p.border.base,
        active: {
          indentBorder: p.border.base
        }
      }
    }
  },

  dropdown: {
    color: p.text.primary,
    iconColor: p.text.subtle,
    bg: p.background.paper,
    hoverBg: p.background.surface0,
    separator: p.border.base,
    mutedText: p.text.disabled
  },

  request: {
    methods: {
      get: p.status.ok,
      post: p.hues.purple,
      put: p.status.warning,
      delete: p.status.error,
      patch: p.hues.purple,
      options: p.hues.teal,
      head: p.hues.cyan
    },
    grpc: p.hues.indigo,
    ws: p.status.warning,
    gql: p.hues.pink
  },

  requestTabPanel: {
    responseStatus: p.text.muted,
    responseOk: p.status.ok,
    responseError: p.status.error,
    responsePending: p.status.info
  },

  codemirror: {
    bg: p.background.paper,
    border: p.background.paper,
    gutter: {
      bg: p.background.paper
    },
    variable: {
      valid: p.status.ok,
      invalid: p.status.error,
      prompt: p.status.info
    },
    tokens: {
      definition: p.link,
      property: p.link,
      string: p.hues.brown,
      number: p.hues.pink,
      atom: p.hues.rose,
      variable: p.hues.pink,
      keyword: p.hues.rose,
      comment: p.text.disabled,
      operator: p.text.muted,
      tag: p.hues.rose,
      tagBracket: p.text.muted
    }
  },

  table: {
    border: p.border.subtle,
    thead: {
      color: p.text.subtle
    },
    striped: p.background.surface0,
    input: {
      color: p.text.primary
    }
  },

  tabs: {
    active: {
      color: p.text.primary
    },
    secondary: {
      active: {
        bg: p.background.surface1,
        color: p.text.primary
      },
      inactive: {
        bg: p.background.surface0,
        color: p.text.muted
      }
    }
  },

  scrollbar: {
    color: p.text.disabled
  },

  console: {
    buttonHoverBg: p.background.surface1
  },

  app: {
    collection: {
      toolbar: {
        environmentSelector: {
          bg: p.background.paper,
          border: p.border.base,
          text: p.text.primary,
          caret: p.text.disabled,
          separator: p.border.base,
          hoverBg: p.background.paper,
          hoverBorder: p.border.strong,
          noEnvironment: {
            text: p.text.muted,
            bg: p.background.paper,
            border: p.border.strong,
            hoverBg: p.background.paper,
            hoverBorder: p.text.disabled
          }
        }
      }
    }
  }
});

export const backstageLight = createBackstageTheme(light, 'light', backstageLightPalette);
export const backstageDark = createBackstageTheme(dark, 'dark', backstageDarkPalette);
