import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'AHS Real Estate - Hệ Thống Quản Lý Quỹ Hàng & Giao Dịch Bất Động Sản',
  description: 'Nền tảng quản lý quỹ hàng bất động sản thời gian thực, giữ căn 30 phút, đối soát cọc VietQR tự động và quản lý hợp đồng pháp lý.',
  keywords: ['AHS Real Estate', 'Bất động sản', 'Quản lý quỹ hàng', 'VietQR', 'Hợp đồng mua bán'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body className={`${fontSans.variable} font-sans bg-[#080b11] text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
