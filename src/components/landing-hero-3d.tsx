"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef } from "react";

type Pointer = { x: number; y: number };

function CityBlocks({ pointerRef }: { pointerRef: React.MutableRefObject<Pointer> }) {
  const group = useRef<THREE.Group>(null);
  const blocks = useMemo(() => {
    const rnd = (i: number, salt: number) => {
      const t = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
      return t - Math.floor(t);
    };
    const data: { x: number; z: number; w: number; h: number; d: number }[] = [];
    for (let i = 0; i < 28; i++) {
      const col = i % 7;
      const row = Math.floor(i / 7);
      data.push({
        x: col * 0.95 - 2.85,
        z: row * 0.95 - 1.4,
        w: 0.42 + rnd(i, 1) * 0.28,
        h: 0.6 + rnd(i, 2) * 2.4,
        d: 0.42 + rnd(i, 3) * 0.22,
      });
    }
    return data;
  }, []);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const p = pointerRef.current;
    g.rotation.y += delta * 0.11;
    const targetX = p.y * 0.22;
    const targetZ = p.x * 0.18;
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, targetX, 0.06);
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, targetZ, 0.06);
  });

  return (
    <group ref={group} position={[0, -0.35, 0]}>
      {blocks.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]}>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial
            color="#1f1a24"
            metalness={0.45}
            roughness={0.38}
            emissive="#6b5c6f"
            emissiveIntensity={0.12}
          />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[14, 10]} />
        <meshStandardMaterial color="#080808" metalness={0.15} roughness={0.92} />
      </mesh>
    </group>
  );
}

export function LandingHero3D() {
  const pointerRef = useRef<Pointer>({ x: 0, y: 0 });

  return (
    <div
      className="relative h-[min(28rem,55vh)] w-full min-h-[220px] md:h-[min(32rem,70vh)]"
      onPointerMove={(e) => {
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        pointerRef.current = {
          x: ((e.clientX - r.left) / r.width) * 2 - 1,
          y: -(((e.clientY - r.top) / r.height) * 2 - 1),
        };
      }}
      onPointerLeave={() => {
        pointerRef.current = { x: 0, y: 0 };
      }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-[#6b5c6f]/18 via-transparent to-transparent" />
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/[0.08] shadow-[0_24px_80px_rgba(0,0,0,0.65)]" />
      <Canvas
        className="rounded-2xl"
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 2.2, 6.2], fov: 42, near: 0.1, far: 40 }}
      >
        <color attach="background" args={["#050505"]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 8, 5]} intensity={1.15} />
        <pointLight position={[-3, 2, 2]} intensity={0.55} color="#b8a8bc" />
        <CityBlocks pointerRef={pointerRef} />
      </Canvas>
    </div>
  );
}
