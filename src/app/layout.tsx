import type { Metadata } from 'next'
import { DM_Sans, Space_Grotesk } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Blindspot — The tutor that reveals what you have not seen yet',
  description: 'Você ainda não sabe o que não sabe.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${dmSans.variable} ${spaceGrotesk.variable} font-sans bg-[#08090F] text-[#F0F0F5] min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
