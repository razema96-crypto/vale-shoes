/**
 * Internal render studio (not linked anywhere, noindex).
 * Used by scripts/render_demo_images.py to render the demo product images from the
 * same procedural 3D shoe used on the homepage. URL params: model, upper, sole, finish, toe, angle.
 */
import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { Shoe } from "../three/Shoe";
import { StudioEnvironment } from "../three/StudioLights";
import type { ShoeModel, ShoeFinish } from "../three/shoe";

const ANGLES: Record<string, { dir: [number, number, number]; target: [number, number, number]; fov: number; dist: number }> = {
  hero: { dir: [0.62, 0.4, -0.68], target: [0, 0.48, 0], fov: 28, dist: 8.0 },
  side: { dir: [0, 0.12, -1], target: [0, 0.55, 0], fov: 26, dist: 8.6 },
  top: { dir: [0.5, 0.7, -0.5], target: [0, 0.4, 0], fov: 28, dist: 8.2 },
};

function Rig({ angle }: { angle: string }) {
  const { camera, gl } = useThree();
  useEffect(() => {
    const base = ANGLES[angle] ?? ANGLES.hero;
    const tall = ["chelsea", "ankleboot"].includes(new URLSearchParams(location.search).get("model") || "");
    const a = tall ? { ...base, target: [base.target[0], base.target[1] + 0.22, base.target[2]] as [number, number, number], dist: base.dist + 0.5 } : base;
    const d = new THREE.Vector3(...a.dir).normalize().multiplyScalar(a.dist);
    camera.position.set(a.target[0] + d.x, a.target[1] + d.y, a.target[2] + d.z);
    (camera as THREE.PerspectiveCamera).fov = a.fov;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    camera.lookAt(...a.target);
    let n = 0;
    const tick = () => {
      if (++n > 12) (window as any).__studioReady = true;
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [angle, camera, gl]);
  return null;
}

export default function Studio() {
  const q = new URLSearchParams(location.search);
  const bg = q.get("bg") || "#f5f4f0";
  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex";
    document.head.appendChild(m);
    return () => m.remove();
  }, []);
  return (
    <div style={{ width: "100vw", height: "100vh", background: bg }}>
      <Canvas
        id="studio"
        shadows
        dpr={Number(q.get("dpr") || 2)}
        gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        camera={{ fov: 30, position: [0, 1, 5] }}
      >
        <color attach="background" args={[bg]} />
        <Suspense fallback={null}>
          <StudioEnvironment intensity={0.9} />
          <directionalLight position={[-3, 6, -3]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
          <ambientLight intensity={0.15} />
          <Shoe
            mirror
            params={{
              model: (q.get("model") as ShoeModel) || "oxford",
              upper: q.get("upper") || "#151413",
              sole: q.get("sole") || "#0c0b0b",
              finish: (q.get("finish") as ShoeFinish) || "polished",
              toe: (q.get("toe") as "round" | "almond" | "pointed") || undefined,
            }}
          />
          <ContactShadows position={[0, 0.001, 0]} opacity={0.55} scale={7} blur={2.4} far={1.2} resolution={1024} color="#2a2118" />
          <Rig angle={q.get("angle") || "hero"} />
        </Suspense>
      </Canvas>
    </div>
  );
}
