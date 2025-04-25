import { Metadata } from 'next';
import { AuthProviderWrapper } from './components/AuthProviderWrapper'; // Caminho corrigido
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestão de Patrimônio",
  description: "Sistema de Gestão de Patrimônio",
  icons: {
    icon: [
      { url: '/logo.ico' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-br">
      <body>
        <AuthProviderWrapper>
          {children}
        </AuthProviderWrapper>
      </body>
    </html>
  );
}
