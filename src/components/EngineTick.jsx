import { useFrame } from '@react-three/fiber'

/** Drives engine.tick from inside the R3F render loop */
export default function EngineTick({ engine }) {
  useFrame((_, dt) => engine.tick(dt))
  return null
}
