import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Hisaab Kitaab";
  
  return {
    name: appName,
    short_name: appName,
    description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || "Offline Finance Manager",
    start_url: '/',
    display: 'standalone',
    background_color: '#181a20',
    theme_color: '#181a20',
    icons: [
      {
        src: process.env.NEXT_PUBLIC_APP_LOGO || '/Logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: process.env.NEXT_PUBLIC_APP_LOGO || '/Logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      }
    ],
  }
}
