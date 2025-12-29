"use client";

import { useState, useEffect } from "react";
import { usePublicClient } from "wagmi";
import { parseAbiItem } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";

// Твой адрес контракта
const CONTRACT_ADDRESS = "0xF97BCb49CD1Fd15CB8512CB90117661a8fF25424" as `0x${string}`;

interface LeaderboardEntry {
  player: string;
  height: bigint;
}

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const publicClient = usePublicClient();

  useEffect(() => {
    const loadLeaderboard = async () => {
      if (!publicClient) return;

      try {
        const logs = await publicClient.getLogs({
          address: CONTRACT_ADDRESS,
          event: parseAbiItem(
            "event TowerSaved(address indexed player, uint256 height, string structure)"
          ),
          fromBlock: BigInt(0),
          toBlock: "latest",
        });

        // Безопасный парсинг с проверкой на undefined
        const entries: LeaderboardEntry[] = logs
          .map((log: any) => {
            // Проверяем, что args существует и поля не undefined
            if (
              log.args &&
              log.args.player &&
              typeof log.args.player === "string" &&
              log.args.height !== undefined &&
              typeof log.args.height === "bigint"
            ) {
              return {
                player: log.args.player,
                height: log.args.height,
              };
            }
            return null;
          })
          .filter((entry): entry is LeaderboardEntry => entry !== null);

        // Лучший результат на игрока (исторический максимум)
        const bestPerPlayer = new Map<string, bigint>();
        entries.forEach((entry) => {
          const current = bestPerPlayer.get(entry.player);
          if (!current || entry.height > current) {
            bestPerPlayer.set(entry.player, entry.height);
          }
        });

        // ТОП-3
        const top3 = Array.from(bestPerPlayer.entries())
          .sort((a, b) => Number(b[1] - a[1]))
          .slice(0, 3)
          .map(([player, height]) => ({ player, height }));

        setLeaders(top3);
      } catch (error) {
        console.error("Ошибка загрузки лидерборда:", error);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, [publicClient]);

  // Реал-тайм обновление при новом сохранении
  useEffect(() => {
    if (!publicClient) return;

    const unwatch = publicClient.watchEvent({
      address: CONTRACT_ADDRESS,
      event: parseAbiItem(
        "event TowerSaved(address indexed player, uint256 height, string structure)"
      ),
      onLogs: () => {
        // Простой способ обновления — перезагрузка страницы
        window.location.reload();
      },
    });

    return () => unwatch();
  }, [publicClient]);

  const shortAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center py-12">
      <div className="max-w-3xl w-full px-4">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-5xl font-bold">🏆 TOP-3 Base World</h1>
          <ConnectButton />
        </div>

        <div className="bg-slate-800 rounded-2xl shadow-2xl p-10 border-4 border-slate-600">
          {loading ? (
            <p className="text-center text-3xl py-12">Загружаем с Base...</p>
          ) : leaders.length === 0 ? (
            <p className="text-center text-3xl py-12 text-gray-400">
              Никто ещё не в топе. Построй самую высокую!
            </p>
          ) : (
            <div className="space-y-6">
              {leaders.map((entry, index) => (
                <div
                  key={entry.player}
                  className="flex items-center justify-between p-8 bg-gradient-to-r from-slate-700 to-slate-600 rounded-xl shadow-xl hover:scale-105 transition-all border-2 border-slate-500"
                >
                  <div className="flex items-center gap-6">
                    <div className="text-6xl font-black drop-shadow-lg">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                    </div>
                    <div className="text-xl font-mono text-gray-300">
                      {shortAddress(entry.player)}
                    </div>
                  </div>
                  <div className="text-5xl font-black text-green-400 drop-shadow-lg">
                    {entry.height.toString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center mt-12 text-xl text-gray-400">
          Обновляется в реальном времени с блокчейна Base
        </p>
      </div>
    </div>
  );
}
