import { useEffect, useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import { buildShoe, disposeShoe, type ShoeParams } from "./shoe";

type Props = ThreeElements["group"] & { params: ShoeParams; mirror?: boolean };

/** React wrapper around the procedural shoe. `mirror` turns the (right) shoe into a left shoe. */
export function Shoe({ params, mirror, ...rest }: Props) {
  const key = JSON.stringify(params);
  const obj = useMemo(() => buildShoe(params), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => disposeShoe(obj), [obj]);
  return (
    <group {...rest}>
      <primitive object={obj} scale={[1, 1, mirror ? -1 : 1]} />
    </group>
  );
}
