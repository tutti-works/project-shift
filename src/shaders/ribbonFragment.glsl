uniform vec3 uColor;
uniform float uOpacity;

varying vec2 vUv;

void main() {
  gl_FragColor = vec4(uColor, uOpacity);
}
