import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

interface ProjectBarProps {
  position: [number, number, number];
  label: string;
  value: number;
  maxValue: number;
  color: string;
  delay?: number;
}

export function ProjectBar({
  position,
  label,
  value,
  maxValue,
  color,
  delay = 0,
}: ProjectBarProps) {
  const barRef = useRef<THREE.Mesh>(null!);
  const groupRef = useRef<THREE.Group>(null!);
  const targetHeight = (value / maxValue) * 2.5;

  useFrame((state) => {
    if (!barRef.current || !groupRef.current) return;
    const t = state.clock.elapsedTime;

    const progress = Math.min(1, (t - delay * 0.3) * 0.8);
    const eased = 1 - Math.pow(1 - Math.max(0, progress), 3);
    barRef.current.scale.y = eased;

    groupRef.current.position.y = position[1] + Math.sin(t * 0.6 + delay) * 0.05;
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh ref={barRef} position={[0, targetHeight / 2, 0]}>
        <boxGeometry args={[0.4, targetHeight, 0.4]} />
        <meshPhysicalMaterial
          color={color}
          metalness={0.3}
          roughness={0.3}
          transparent
          opacity={0.85}
          emissive={color}
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Label and value via Html */}
      <Html center position={[0, -0.3, 0.3]} distanceFactor={8} style={{ pointerEvents: "none" }}>
        <span style={{ fontSize: "10px", color: "#a0a0b8", fontFamily: "system-ui" }}>{label}</span>
      </Html>
      <Html center position={[0, targetHeight + 0.25, 0]} distanceFactor={8} style={{ pointerEvents: "none" }}>
        <span style={{ fontSize: "12px", color: "#fff", fontWeight: 700, fontFamily: "system-ui" }}>{value}</span>
      </Html>
    </group>
  );
}
