import { Environment, Lightformer } from "@react-three/drei";

/** Fully procedural studio environment (no HDR download): softboxes + rim strips. */
export function StudioEnvironment({ dark = false, intensity = 1 }: { dark?: boolean; intensity?: number }) {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={[dark ? "#050505" : "#6b5d2a"]} />
      {/* key softbox, top */}
      <Lightformer form="rect" intensity={2.4 * intensity} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[8, 4, 1]} />
      {/* large front-left box */}
      <Lightformer form="rect" intensity={1.4 * intensity} position={[-5, 2, 4]} rotation-y={Math.PI / 4} scale={[5, 3, 1]} />
      {/* warm rim from behind */}
      <Lightformer form="rect" color="#ffd9a6" intensity={2 * intensity} position={[4, 1.5, -5]} rotation-y={-Math.PI / 5} scale={[1.2, 5, 1]} />
      {/* thin highlight strips that draw lines on polished leather */}
      <Lightformer form="rect" intensity={3 * intensity} position={[0, 1.2, 6]} scale={[10, 0.25, 1]} />
      <Lightformer form="rect" intensity={1.2 * intensity} position={[-6, 0.5, -2]} rotation-y={Math.PI / 2} scale={[6, 0.5, 1]} />
    </Environment>
  );
}
