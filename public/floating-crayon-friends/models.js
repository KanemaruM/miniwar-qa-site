import * as THREE from './vendor/three.module.js';
import { reliefData } from './mesh-data.js';

// Only depth is introduced. XY proportions and face strokes come from sampled
// original artwork; there are no procedurally substituted eyes, mouths or ears.
const linear = Float32Array.from({ length: 256 }, (_, i) => {
  const x = i / 255;
  return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4;
});
const frontMaterial = new THREE.MeshBasicMaterial({
  vertexColors: true, toneMapped: false, side: THREE.FrontSide
});
const wallMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true, roughness: .93, metalness: 0, side: THREE.FrontSide
});
const cache = new Map();
function readGeometry(record) {
  if (cache.has(record.id)) return cache.get(record.id);
  const decoded = atob(record.data);
  const buffer = new ArrayBuffer(decoded.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
  const view = new DataView(buffer);
  const vertices = view.getUint32(4, true), indexCount = view.getUint32(8, true);
  let offset = 16;
  const positions = new Float32Array(buffer, offset, vertices * 3); offset += vertices * 12;
  const srgb = new Uint8Array(buffer, offset, vertices * 3); offset += vertices * 3;
  const colors = Float32Array.from(srgb, c => linear[c]);
  const normals = Float32Array.from(new Int8Array(buffer, offset, vertices * 3)); offset += vertices * 3;
  offset = (offset + 3) & ~3;
  const indices = new Uint32Array(buffer, offset, indexCount);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.addGroup(0, record.frontTriangles * 3, 0);
  geometry.addGroup(record.frontTriangles * 3, indexCount - record.frontTriangles * 3, 1);
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  cache.set(record.id, geometry);
  return geometry;
}
export function createFriends() {
  return reliefData.map(record => {
    const group = new THREE.Group();
    group.name = record.name;
    group.userData = {
      drawingId: record.id, baseScale: 1, frontAxis: '+Z',
      faithfulRelief: true, addedDepth: record.depth,
      triangles: record.triangles
    };
    const relief = new THREE.Mesh(readGeometry(record), [frontMaterial, wallMaterial]);
    relief.name = `original-strokes-${record.id}`;
    relief.castShadow = true; relief.receiveShadow = true;
    group.add(relief);
    return { group, name: record.name, color: record.color };
  });
}
