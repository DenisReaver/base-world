"use client"; // ОБЯЗАТЕЛЬНО! Это делает компонент клиентским

import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";

import { base } from "wagmi/chains";
import { http } from "wagmi"; // ← Добавляем импорт http

const projectId = "0aedb52ff8c452a4003ed0a9b0dca8da"; // Оставь свой, или создай новый на https://cloud.reown.com

const config = getDefaultConfig({
  appName: "Goo Tower",
  projectId,
  chains: [base], // mainnet Base
  ssr: true,
  transports: {
    // ← ВОТ ГЛАВНОЕ ИСПРАВЛЕНИЕ: используем стабильный публичный RPC
    [base.id]: http("https://base-mainnet.public.blastapi.io"),
    // Если этот не сработает — раскомментируй один из альтернативных:
    // [base.id]: http("https://base-rpc.publicnode.com"),
    // [base.id]: http("https://base.gateway.tenderly.co"),
    // [base.id]: http("https://rpc.base.chainspots.com"),
  },
});

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}