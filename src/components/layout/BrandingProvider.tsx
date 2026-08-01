import React, { useEffect } from 'react'
import { useOrganization } from '@/hooks/use-organization'

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { data: org } = useOrganization()

  useEffect(() => {
    if (org?.primary_color) {
      // Overwrite the CSS variables with the custom brand color
      // By default in shadcn/tailwind these are OKLCH, but they accept HEX too in most cases.
      const root = document.documentElement
      root.style.setProperty('--primary', org.primary_color)
      root.style.setProperty('--ring', org.primary_color)
      root.style.setProperty('--brand', org.primary_color)
      root.style.setProperty('--sidebar-primary', org.primary_color)
    } else {
      // Reset if no custom color
      const root = document.documentElement
      root.style.removeProperty('--primary')
      root.style.removeProperty('--ring')
      root.style.removeProperty('--brand')
      root.style.removeProperty('--sidebar-primary')
    }
  }, [org?.primary_color])

  return <>{children}</>
}
