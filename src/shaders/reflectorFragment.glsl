uniform sampler2D tDiffuse;
uniform vec3 color;
uniform float textureOpacity;

varying vec4 vUv;

void main() {
  vec4 reflectionSample = texture2DProj(tDiffuse, vUv);
  vec2 uv = vUv.xy / vUv.w;

  float isValidReflection =
    step(0.0, uv.x) * step(uv.x, 1.0) *
    step(0.0, uv.y) * step(uv.y, 1.0) *
    step(0.0, vUv.w);

  vec3 blended = mix(color, reflectionSample.rgb, textureOpacity * isValidReflection);
  gl_FragColor = vec4(blended, 1.0);
}
