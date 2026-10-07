/*
 * Site shell data (announcement, navigation, footer). Everything here is mock data served from
 * local files until the backend/admin exists; components only depend on these shapes.
 */

export interface Announcement {
  id: string
  text: string
}

export interface NavLink {
  id: string
  label: string
  /** Router path. */
  to: string
}

export interface FooterColumn {
  id: string
  title: string
  links: NavLink[]
}

export interface SocialLink {
  id: string
  label: string
  href: string
}

export interface SiteFooterData {
  description: string
  columns: FooterColumn[]
  socials: SocialLink[]
}
