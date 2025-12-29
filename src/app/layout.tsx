import "./globals.css"; // Твой глобальный CSS (если есть Tailwind — оставь @tailwind директивы там)
import Providers from "./Providers"; // Путь к файлу из шага 1

export const metadata = {
  title: "Goo Tower Challenge",
  description: "Построй самую высокую башню из гуу-шариков!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}