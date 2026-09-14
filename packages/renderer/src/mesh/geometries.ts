/**
 * 测试用 UV 球与立方体（M4 材质验收）。
 */

const VERTEX_STRIDE = 32

/**
 * UV 球体：position + normal + uv。
 *
 * @param radius 半径
 * @param widthSegments 经向
 * @param heightSegments 纬向
 */
export function createSphereGeometry(
  radius = 1,
  widthSegments = 24,
  heightSegments = 16,
): { vertices: Float32Array; indices: Uint16Array; stride: number } {
  const positions: number[] = []
  const indices: number[] = []
  for (let y = 0; y <= heightSegments; y++) {
    const v = y / heightSegments
    const theta = v * Math.PI
    const sinTheta = Math.sin(theta)
    const cosTheta = Math.cos(theta)
    for (let x = 0; x <= widthSegments; x++) {
      const u = x / widthSegments
      const phi = u * Math.PI * 2
      const nx = Math.cos(phi) * sinTheta
      const ny = cosTheta
      const nz = Math.sin(phi) * sinTheta
      positions.push(nx * radius, ny * radius, nz * radius, nx, ny, nz, u, v)
    }
  }
  const cols = widthSegments + 1
  for (let y = 0; y < heightSegments; y++) {
    for (let x = 0; x < widthSegments; x++) {
      const a = y * cols + x
      const b = a + cols
      indices.push(a, a + 1, b, a + 1, b + 1, b)
    }
  }
  return {
    vertices: new Float32Array(positions),
    indices: new Uint16Array(indices),
    stride: VERTEX_STRIDE,
  }
}

/**
 * 单位立方体。
 *
 * @param size 边长
 */
export function createBoxGeometry(size = 1): {
  vertices: Float32Array
  indices: Uint16Array
  stride: number
} {
  const h = size * 0.5
  const faces: { n: [number, number, number]; p: [number, number, number][] }[] = [
    {
      n: [0, 0, 1],
      p: [
        [-h, -h, h],
        [h, -h, h],
        [h, h, h],
        [-h, h, h],
      ],
    },
    {
      n: [0, 0, -1],
      p: [
        [h, -h, -h],
        [-h, -h, -h],
        [-h, h, -h],
        [h, h, -h],
      ],
    },
    {
      n: [0, 1, 0],
      p: [
        [-h, h, h],
        [h, h, h],
        [h, h, -h],
        [-h, h, -h],
      ],
    },
    {
      n: [0, -1, 0],
      p: [
        [-h, -h, -h],
        [h, -h, -h],
        [h, -h, h],
        [-h, -h, h],
      ],
    },
    {
      n: [1, 0, 0],
      p: [
        [h, -h, h],
        [h, -h, -h],
        [h, h, -h],
        [h, h, h],
      ],
    },
    {
      n: [-1, 0, 0],
      p: [
        [-h, -h, -h],
        [-h, -h, h],
        [-h, h, h],
        [-h, h, -h],
      ],
    },
  ]
  const vertices: number[] = []
  const indices: number[] = []
  let base = 0
  for (const face of faces) {
    const uvs = [
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ]
    for (let i = 0; i < 4; i++) {
      const p = face.p[i]!
      const uv = uvs[i]!
      vertices.push(p[0], p[1], p[2], face.n[0], face.n[1], face.n[2], uv[0]!, uv[1]!)
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
    base += 4
  }
  return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
    stride: VERTEX_STRIDE,
  }
}
