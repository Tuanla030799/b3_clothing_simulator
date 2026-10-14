import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context'

/*
 * Ant Design Vue theme from the shared design tokens (@lituta/ui tokens.css), read at runtime so
 * the colors are defined in one place. Ant components then match the shared Button/Select.
 */
function token(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

export function antTheme(): ThemeConfig {
  const primary = token('--primary', '#456454')
  return {
    token: {
      colorPrimary: primary,
      // Ant's global link color would otherwise turn the shared Link blue.
      colorLink: primary,
      colorLinkHover: primary,
      colorError: token('--destructive', '#b42318'),
      colorText: token('--foreground', '#302c29'),
      colorTextSecondary: token('--muted-foreground', '#6b635c'),
      colorBorder: token('--input', '#8c8176'),
      colorBorderSecondary: token('--border', '#e5ded5'),
      colorBgLayout: token('--background', '#faf7f2'),
      colorBgContainer: token('--card', '#ffffff'),
      borderRadius: 8,
      fontFamily: getComputedStyle(document.body).fontFamily,
      fontSize: 14,
    },
    components: {
      Menu: {
        colorItemBgSelected: token('--secondary', '#f3e3df'),
        colorItemTextSelected: token('--foreground', '#302c29'),
        colorItemBgHover: token('--muted', '#f3eee7'),
      },
    },
  }
}
