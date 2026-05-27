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
  title: 'BlindSpot — O tutor que revela o que você ainda não viu',
  description: 'Deixe de adivinhar e comece a dominar. O tutor de AI que revela o que você ainda não sabe que não sabe.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${dmSans.variable} ${spaceGrotesk.variable} font-sans bg-[#0d0d0d] text-[#F0F0F5] min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
