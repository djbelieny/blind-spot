import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Blind Spot — The tutor that reveals what you have not seen yet',
  description: 'Você ainda não sabe o que não sabe.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#08090F] text-[#F0F0F5] min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
