"use client";

import { useEffect, useRef, useState } from "react";
import Matter from "matter-js";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

// ЗАМЕНИ НА СВОИ
const CONTRACT_ADDRESS = "0xF97BCb49CD1Fd15CB8512CB90117661a8fF25424" as `0x${string}`;
const ABI = [
	{
		"inputs": [],
		"name": "resetTower",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_height",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "_structure",
				"type": "string"
			}
		],
		"name": "saveTower",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "player",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "height",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "structure",
				"type": "string"
			}
		],
		"name": "TowerSaved",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_player",
				"type": "address"
			}
		],
		"name": "getTower",
		"outputs": [
			{
				"components": [
					{
						"internalType": "uint256",
						"name": "height",
						"type": "uint256"
					},
					{
						"internalType": "string",
						"name": "structure",
						"type": "string"
					}
				],
				"internalType": "struct GooTower.Tower",
				"name": "",
				"type": "tuple"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "playerTowers",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "height",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "structure",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
] as const;

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentHeight, setCurrentHeight] = useState(0);
  const [isMusicOn, setIsMusicOn] = useState(true); // Музыка включена по умолчанию
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ballsRef = useRef<Matter.Body[]>([]);
  const { address, isConnected } = useAccount();

  const { data: savedTower } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "getTower",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address },
  });

  const { writeContract: saveTower, isPending: isSaving } = useWriteContract();
  const { writeContract: resetTower, isPending: isResetting } = useWriteContract();
useEffect(() => {
  // Создаём аудио только в браузере
  audioRef.current = new Audio("/music/background.mp3");
  audioRef.current.loop = true;         // Зацикливаем трек
  audioRef.current.volume = 0.3;        // Тихо, чтобы не мешать (30%)
  
  // Автозапуск может быть заблокирован браузером, поэтому ловим ошибку
  if (isMusicOn) {
    audioRef.current.play().catch(() => {
      // Ничего не делаем — пользователь должен сначала взаимодействовать со страницей
    });
  }

  // Очистка при выходе
  return () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };
}, []); // Пустой массив — выполнится один раз

// Включение/выключение по состоянию
useEffect(() => {
  if (audioRef.current) {
    if (isMusicOn) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }
}, [isMusicOn]);


  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = 900;
    canvas.height = 600;

    const engine = Matter.Engine.create({ gravity: { y: 0.7 } });
    engine.constraintIterations = 12; // ← КЛЮЧЕВОЕ: стабильность constraints
    const world = engine.world;

    const render = Matter.Render.create({
      canvas,
      engine,
      options: { width: 900, height: 600, wireframes: false, background: "#1e293b" },
    });
    Matter.Render.run(render);

    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    // Пол
    const ground = Matter.Bodies.rectangle(450, 590, 900, 40, { isStatic: true, render: { fillStyle: "#475569" } });

    // Шарики (липкие Base шарики)
    const balls: Matter.Body[] = [];
    for (let i = 0; i < 100; i++) {
      const x = 120 + (i % 18) * 42;
      const y = 520 - Math.floor(i / 18) * 42;
      const ball = Matter.Bodies.circle(x, y, 16, {
        restitution: 0.02,  // Почти не отскакивают
        friction: 0.8,      // Липнут
        frictionAir: 0.01,
        density: 0.004,
        render: { fillStyle: "#3b82f6" },
      });
      balls.push(ball);
    }
    ballsRef.current = balls;
    Matter.World.add(world, [ground, ...balls]);

    // Мышь
    const mouse = Matter.Mouse.create(canvas);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.98, render: { visible: false } },
    });
    Matter.World.add(world, mouseConstraint);

    // ← ЗДЕСЬ ИСПРАВЛЕНИЕ: соединения по расстоянию (ТОП-4 ближайших)
Matter.Events.on(mouseConstraint, "enddrag", (event: any) => {
  const dragged = event.source?.body;
  if (!dragged) return;

  const nearby = ballsRef.current
    .filter((b) => b !== dragged)
    .map((other) => ({
      body: other,
      dist: Matter.Vector.magnitude(Matter.Vector.sub(dragged.position, other.position)),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 4); // Топ-4 ближайших

  nearby.forEach(({ body: closest, dist }, idx) => {
    if (dist < 70) {
      const constraint = Matter.Constraint.create({
        bodyA: dragged,
        bodyB: closest,
        length: dist * 0.9,
        stiffness: 0.85 - idx * 0.05,
        damping: 0.05,
        render: { strokeStyle: "#10b981", lineWidth: 6 },
      });
      Matter.World.add(world, constraint);
    }
  });
});

    // Высота (мин Y)
    Matter.Events.on(engine, "afterUpdate", () => {
      if (balls.length === 0) return;
      const minY = Math.min(...balls.map(b => b.position.y));
      setCurrentHeight(Math.max(0, Math.round(580 - minY)));
    });

    return () => {
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
    };
  }, []);

  const handleSave = () => {
    saveTower({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "saveTower", args: [BigInt(currentHeight), "[]"] });
  };

  const handleReset = () => {
 //   resetTower({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "resetTower" }); ЗАЧЕМ НАМ ОНЧЕЙН СБРОС ??????
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center py-8">
      <div className="max-w-5xl w-full px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">World Of Base</h1>
          <ConnectButton />
        </div>
<div className="mt-10 text-center">
  <Link
    href="/leaderboard"
    className="inline-block px-12 py-5 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold text-2xl shadow-2xl transition"
  >
    🏆 Лидерборд
  </Link>
</div>
{/* Кнопка включения/выключения музыки */}
<div className="fixed top-4 right-4 z-50">
  <button
    onClick={() => setIsMusicOn(prev => !prev)}
    className="p-4 bg-slate-800 hover:bg-slate-600 rounded-full shadow-2xl transition text-3xl border-2 border-slate-500"
    aria-label={isMusicOn ? "Выключить музыку" : "Включить музыку"}
  >
    {isMusicOn ? "🔊" : "🔇"}
  </button>
</div>
        <div className="bg-slate-800 rounded-xl p-8 shadow-2xl">
          <canvas ref={canvasRef} className="border-4 border-emerald-600 rounded-lg shadow-lg" />
        </div>
        <div className="mt-8 flex flex-wrap justify-center items-center gap-8 text-xl">
          <div>Высота: <span className="font-bold text-blue-400">{currentHeight}</span></div>
          {savedTower && savedTower.height > BigInt(0) && (
  <div>
    Рекорд: <span className="font-bold text-green-400">{savedTower.height.toString()}</span>
  </div>
)}
          <div className="flex gap-4">
            <button onClick={handleSave} disabled={!isConnected || isSaving} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-bold">
              {isSaving ? "Сохраняем..." : "Сохранить на Base"}
            </button>
            <button onClick={handleReset} disabled={isResetting} className="px-8 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-bold">
              Начать заново
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
