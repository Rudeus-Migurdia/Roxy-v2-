/**
 * P5R (Persona 5 Royal) inspired theme configuration
 * Defines color palette, typography, and animation timing
 */

export interface P5RTheme {
  colors: {
    primary: {
      black: string;
      white: string;
      red: string;
      redDark: string;
    };
    accent: {
      yellow: string;
      gray: string;
    };
    ui: {
      overlay: string;
      glass: string;
      border: string;
    };
    dialog: {
      background: string;
      border: string;
      text: string;
      nameTag: string;
    };
  };
  typography: {
    dialog: {
      fontSize: string;
      lineHeight: number;
      fontFamily: string;
    };
    ui: {
      fontSize: string;
      fontWeight: string;
      textTransform: string;
      letterSpacing: string;
    };
  };
  transitions: {
    fast: number;
    normal: number;
    slow: number;
    dramatic: number;
  };
  easing: {
    sharp: string;
    smooth: string;
    bounce: string;
  };
}

export const P5RTheme: P5RTheme = {
  colors: {
    primary: {
      black: '#0a0a0a',
      white: '#ffffff',
      red: '#e63946',        // Rebellion red
      redDark: '#b82d3a',
    },
    accent: {
      yellow: '#ffd60a',
      gray: '#6c757d',
    },
    ui: {
      overlay: 'rgba(10, 10, 10, 0.9)',
      glass: 'rgba(255, 255, 255, 0.1)',
      border: 'rgba(255, 255, 255, 0.2)',
    },
    dialog: {
      background: 'rgba(0, 0, 0, 0.85)',
      border: '#e63946',
      text: '#ffffff',
      nameTag: '#e63946',
    },
  },
  typography: {
    dialog: {
      fontSize: '18px',
      lineHeight: 1.6,
      fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
    },
    ui: {
      fontSize: '14px',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: '2px',
    },
  },
  transitions: {
    fast: 150,
    normal: 300,
    slow: 600,
    dramatic: 1200,
  },
  easing: {
    sharp: 'cubic-bezier(0.16, 1, 0.3, 1)',     // P5R sharp feel
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',     // Standard smooth
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Bouncy entrance
  },
};

/**
 * Transition types for P5R style effects
 */
export const TRANSITION_TYPES = {
  SHATTER_OUT: 'shatter_out',      // Scene exit with fragments
  SHATTER_IN: 'shatter_in',        // Scene enter with fragments
  SLASH_DOWN: 'slash_down',        // Diagonal slash from top-left
  SLASH_UP: 'slash_up',            // Diagonal slash from bottom-left
  WIPE_HORIZONTAL: 'wipe_h',       // Horizontal wipe
  WIPE_VERTICAL: 'wipe_v',         // Vertical wipe
  GLITCH: 'glitch',                // Digital distortion effect
  FADE: 'fade',                    // Simple fade
} as const;

export type TransitionType = typeof TRANSITION_TYPES[keyof typeof TRANSITION_TYPES];

/**
 * Z-index layers for consistent stacking
 */
export const Z_INDEX = {
  background: 1,
  live2d: 10,
  overlay: 50,
  dialog: 100,
  controlPanel: 90,
  transition: 200,
  tooltip: 300,
} as const;
