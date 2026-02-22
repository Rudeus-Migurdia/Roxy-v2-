/**
 * Notebook Theme Configuration
 * Light theme adapted from P5R design language for productivity interface
 */

export interface NotebookTheme {
  colors: {
    // Background colors
    background: string;
    surface: string;
    surfaceHover: string;

    // Brand colors (preserved from P5R)
    primary: string;
    primaryDark: string;
    primaryLight: string;

    // Text colors
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textOnPrimary: string;

    // UI elements
    border: string;
    divider: string;
    overlay: string;
    shadow: string;

    // Status colors
    success: string;
    warning: string;
    error: string;
    info: string;

    // Sidebar specific
    sidebarBackground: string;
    sidebarBorder: string;
    sidebarHover: string;

    // Chat specific
    chatBubbleUser: string;
    chatBubbleAI: string;
    chatBubbleUserText: string;
    chatBubbleAIText: string;
  };

  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };

  sizing: {
    sidebarWidth: string;
    rightSidebarWidth: string;
    headerHeight: string;
    footerHeight: string;
    live2dMinWidth: string;
    live2dMinHeight: string;
  };

  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
    };
    fontWeight: {
      normal: string;
      medium: string;
      semibold: string;
      bold: string;
    };
    lineHeight: {
      tight: string;
      normal: string;
      relaxed: string;
    };
  };

  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };

  transitions: {
    fast: string;
    normal: string;
    slow: string;
  };

  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
}

export const NotebookTheme: NotebookTheme = {
  colors: {
    // Light mode background
    background: '#f8f9fa',
    surface: '#ffffff',
    surfaceHover: '#f1f3f5',

    // Brand colors (light blue from P5R theme)
    primary: '#64B5F6',
    primaryDark: '#42A5F5',
    primaryLight: '#E3F2FD',

    // Text colors
    textPrimary: '#1a1a1a',
    textSecondary: '#6c757d',
    textMuted: '#adb5bd',
    textOnPrimary: '#ffffff',

    // UI elements
    border: '#dee2e6',
    divider: '#e9ecef',
    overlay: 'rgba(0, 0, 0, 0.5)',
    shadow: 'rgba(0, 0, 0, 0.1)',

    // Status colors
    success: '#51cf66',
    warning: '#ffd43b',
    error: '#ff6b6b',
    info: '#64B5F6',

    // Sidebar specific
    sidebarBackground: '#f1f3f5',
    sidebarBorder: '#dee2e6',
    sidebarHover: '#e9ecef',

    // Chat specific
    chatBubbleUser: '#64B5F6',
    chatBubbleAI: '#ffffff',
    chatBubbleUserText: '#ffffff',
    chatBubbleAIText: '#1a1a1a',
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },

  sizing: {
    sidebarWidth: '280px',
    rightSidebarWidth: '320px',
    headerHeight: '60px',
    footerHeight: '80px',
    live2dMinWidth: '150px',
    live2dMinHeight: '200px',
  },

  typography: {
    fontFamily: '"Inter", "Segoe UI", "Microsoft YaHei", sans-serif',
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '24px',
      '2xl': '32px',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },

  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.07)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
  },

  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
};

// CSS Custom Properties for theme access in CSS files
export const themeCSSVars = `
  :root {
    /* Colors */
    --notebook-bg: ${NotebookTheme.colors.background};
    --notebook-surface: ${NotebookTheme.colors.surface};
    --notebook-surface-hover: ${NotebookTheme.colors.surfaceHover};
    --notebook-primary: ${NotebookTheme.colors.primary};
    --notebook-primary-dark: ${NotebookTheme.colors.primaryDark};
    --notebook-primary-light: ${NotebookTheme.colors.primaryLight};
    --notebook-text-primary: ${NotebookTheme.colors.textPrimary};
    --notebook-text-secondary: ${NotebookTheme.colors.textSecondary};
    --notebook-text-muted: ${NotebookTheme.colors.textMuted};
    --notebook-border: ${NotebookTheme.colors.border};
    --notebook-divider: ${NotebookTheme.colors.divider};
    --notebook-sidebar-bg: ${NotebookTheme.colors.sidebarBackground};
    --notebook-sidebar-border: ${NotebookTheme.colors.sidebarBorder};
    --notebook-chat-user: ${NotebookTheme.colors.chatBubbleUser};
    --notebook-chat-ai: ${NotebookTheme.colors.chatBubbleAI};

    /* Spacing */
    --notebook-spacing-xs: ${NotebookTheme.spacing.xs};
    --notebook-spacing-sm: ${NotebookTheme.spacing.sm};
    --notebook-spacing-md: ${NotebookTheme.spacing.md};
    --notebook-spacing-lg: ${NotebookTheme.spacing.lg};
    --notebook-spacing-xl: ${NotebookTheme.spacing.xl};

    /* Sizing */
    --notebook-sidebar-width: ${NotebookTheme.sizing.sidebarWidth};
    --notebook-right-sidebar-width: ${NotebookTheme.sizing.rightSidebarWidth};
    --notebook-header-height: ${NotebookTheme.sizing.headerHeight};

    /* Typography */
    --notebook-font-family: ${NotebookTheme.typography.fontFamily};
    --notebook-font-size-xs: ${NotebookTheme.typography.fontSize.xs};
    --notebook-font-size-sm: ${NotebookTheme.typography.fontSize.sm};
    --notebook-font-size-base: ${NotebookTheme.typography.fontSize.base};
    --notebook-font-size-lg: ${NotebookTheme.typography.fontSize.lg};
    --notebook-font-size-xl: ${NotebookTheme.typography.fontSize.xl};

    /* Shadows */
    --notebook-shadow-sm: ${NotebookTheme.shadows.sm};
    --notebook-shadow-md: ${NotebookTheme.shadows.md};
    --notebook-shadow-lg: ${NotebookTheme.shadows.lg};

    /* Transitions */
    --notebook-transition-fast: ${NotebookTheme.transitions.fast};
    --notebook-transition-normal: ${NotebookTheme.transitions.normal};
    --notebook-transition-slow: ${NotebookTheme.transitions.slow};

    /* Border Radius */
    --notebook-radius-sm: ${NotebookTheme.borderRadius.sm};
    --notebook-radius-md: ${NotebookTheme.borderRadius.md};
    --notebook-radius-lg: ${NotebookTheme.borderRadius.lg};
    --notebook-radius-full: ${NotebookTheme.borderRadius.full};
  }
`;

// Quick action definitions
export const QUICK_ACTIONS: Array<{
  id: string;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    id: 'study_guide',
    label: '学习指南',
    icon: '📚',
    description: '生成结构化的学习笔记',
  },
  {
    id: 'briefing_doc',
    label: '简报文档',
    icon: '📄',
    description: '创建内容摘要简报',
  },
  {
    id: 'faq',
    label: '常见问题',
    icon: '❓',
    description: '提取关键问题与答案',
  },
  {
    id: 'timeline',
    label: '时间线',
    icon: '📅',
    description: '按时间顺序整理事件',
  },
  {
    id: 'summary',
    label: '摘要',
    icon: '📝',
    description: '生成内容概述',
  },
  {
    id: 'quiz',
    label: '测验',
    icon: '✅',
    description: '创建理解测验题',
  },
  {
    id: 'audio_overview',
    label: '音频概述',
    icon: '🎙️',
    description: '生成音频讨论',
  },
  {
    id: 'mind_map',
    label: '思维导图',
    icon: '🧠',
    description: '可视化概念关系',
  },
];
