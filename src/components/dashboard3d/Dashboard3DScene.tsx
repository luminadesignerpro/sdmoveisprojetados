import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, RoundedBox } from "@react-three/drei";
import { FloatingCard } from "./FloatingCard";
import { ParticleField } from "./ParticleField";
import { ProjectBar } from "./ProjectBar";

const statsCards = [
  {
    position: [-3.5, 2.2, 0] as [number, number, number],
    title: "Total de Projetos",
    value: "47",
    subtitle: "+12% este mes",
    color: "#6366f1",
    icon: "📊",
    delay: 0,
  },
  {
    position: [0.5, 2.2, 0] as [number, number, number],
    title: "Clientes Ativos",
    value: "23",
    subtitle: "+5 novos",
    color: "#22d3ee",
    icon: "👥",
    delay: 1,
  },
  {
    position: [-3.5, 0.2, 0] as [number, number, number],
    title: "Faturamento",
    value: "R$ 89.5K",
    subtitle: "+18% vs anterior",
    color: "#10b981",
    icon: "💰",
    delay: 2,
  },
  {
    position: [0.5, 0.2, 0] as [number, number, number],
    title: "Taxa Conversao",
    value: "68%",
    subtitle: "+3% este mes",
    color: "#f59e0b",
    icon: "🎯",
    delay: 3,
  },
];

const projectBars = [
  { label: "Jan", value: 8, color: "#6366f1" },
  { label: "Fev", value: 12, color: "#6366f1" },
  { label: "Mar", value: 6, color: "#6366f1" },
  { label: "Abr", value: 15, color: "#22d3ee" },
  { label: "Mai", value: 10, color: "#22d3ee" },
  { label: "Jun", value: 18, color: "#10b981" },
];

export function Dashboard3DScene() {
  return (
    <div className="w-full h-full relative" style={{ minHeight: "500px" }}>
      {/* Overlay title */}
      <div className="absolute top-4 left-6 z-10 pointer-events-none">
        <h1 className="text-2xl font-bold text-white/90 tracking-tight">
          Dashboard 3D
        </h1>
        <p className="text-xs text-white/40 mt-1">
          Visão interativa dos indicadores — arraste para explorar
        </p>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-6 z-10 flex gap-4 pointer-events-none">
        {[
          { color: "#6366f1", label: "Projetos" },
          { color: "#22d3ee", label: "Clientes" },
          { color: "#10b981", label: "Receita" },
          { color: "#f59e0b", label: "Conversão" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-white/50">{item.label}</span>
          </div>
        ))}
      </div>

      <Canvas
        camera={{ position: [0, 2, 10], fov: 50 }}
        dpr={[1, 2]}
        style={{ background: "#0a0a14" }}
      >
        {/* Lighting - brighter */}
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} color="#ffffff" />
        <directionalLight position={[-3, 4, -2]} intensity={0.5} color="#c4b5fd" />
        <pointLight position={[0, 5, 3]} intensity={0.8} color="#6366f1" />
        <pointLight position={[-4, 3, 2]} intensity={0.4} color="#22d3ee" />

        <Suspense fallback={null}>
          {/* Stats Cards */}
          {statsCards.map((card, i) => (
            <FloatingCard key={i} {...card} />
          ))}

          {/* Bar Chart */}
          <group position={[4.5, -1.5, -1]}>
            {projectBars.map((bar, i) => (
              <ProjectBar
                key={i}
                position={[i * 0.7 - 1.5, 0, 0]}
                label={bar.label}
                value={bar.value}
                maxValue={20}
                color={bar.color}
                delay={i}
              />
            ))}
          </group>

          {/* Floor grid */}
          <gridHelper
            args={[30, 60, "#1a1a2e", "#1a1a2e"]}
            position={[0, -2.5, 0]}
          />

          {/* Particles */}
          <ParticleField count={300} />
        </Suspense>

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={5}
          maxDistance={18}
          autoRotate
          autoRotateSpeed={0.4}
          maxPolarAngle={Math.PI / 1.8}
          minPolarAngle={Math.PI / 4}
        />
      </Canvas>
    </div>
  );
}
