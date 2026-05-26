import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Blind Spot — The tutor that reveals what you have not seen yet',
  description: 'Você ainda não sabe o que não sabe.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${dmSans.variable} font-sans bg-[#08090F] text-[#F0F0F5] min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
