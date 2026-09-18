import { MeshStandardMaterial } from "three";

// Object-space tooling marks: concentric on turned faces, axial on cylindrical
// surfaces. Derivative filtering prevents high-frequency shimmer during scroll.
export function createMachinedMaterial(properties, finish = "turned") {
  const material = new MeshStandardMaterial(properties);
  if (finish === "rubber") return material;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
      varying vec3 vToolPosition;
      varying vec3 vToolNormal;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
      vToolPosition = position;
      vToolNormal = normal;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
      varying vec3 vToolPosition;
      varying vec3 vToolNormal;
      float toolWave(float phase) {
        return sin(phase) * (1.0 - smoothstep(0.6, 3.0, fwidth(phase)));
      }
      float toolGrain() {
        float radial = length(vToolPosition.yz);
        float face = smoothstep(0.65, 0.95, abs(vToolNormal.x));
        float coordinate = mix(vToolPosition.x, radial, face);
        return toolWave(coordinate * 1250.0) * 0.5
          + toolWave(coordinate * 310.0 + sin(radial * 17.0) * 0.4) * 0.3;
      }`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
      roughnessFactor = clamp(roughnessFactor + toolGrain() * 0.055, 0.18, 0.7);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
      float cutHeight = toolGrain() * 0.00024;
      vec3 toolQ0 = dFdx(-vViewPosition);
      vec3 toolQ1 = dFdy(-vViewPosition);
      vec3 toolR1 = cross(toolQ1, normal);
      vec3 toolR2 = cross(normal, toolQ0);
      float toolDet = dot(toolQ0, toolR1);
      vec3 toolGradient = sign(toolDet) * (dFdx(cutHeight) * toolR1 + dFdy(cutHeight) * toolR2);
      normal = normalize(max(abs(toolDet), 0.00000001) * normal - toolGradient);`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
      diffuseColor.rgb *= 0.97 + toolGrain() * 0.045;`,
      );
  };
  material.customProgramCacheKey = () => "machined-object-space-v2";
  return material;
}

// Cast iron should not read like perfectly smooth painted plastic. This tiny
// object-space variation changes only roughness and albedo, keeping the model
// lightweight while giving broad housings a more believable workshop surface.
export function createCastIronMaterial(properties) {
  const material = new MeshStandardMaterial(properties);
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
      varying vec3 vCastPosition;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
      vCastPosition = position;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
      varying vec3 vCastPosition;
      float castHash(vec3 p) {
        p = fract(p * 0.1031);
        p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }
      float castNoise() {
        vec3 coarse = floor(vCastPosition * 20.0);
        vec3 fine = floor(vCastPosition * 58.0);
        return mix(castHash(coarse), castHash(fine), 0.32);
      }`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
      float castN = castNoise();
      roughnessFactor = clamp(roughnessFactor + (castN - 0.5) * 0.085, 0.42, 0.82);`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
      diffuseColor.rgb *= 0.965 + castNoise() * 0.055;`,
      );
  };
  material.customProgramCacheKey = () => "cast-iron-microvariation-v1";
  return material;
}
