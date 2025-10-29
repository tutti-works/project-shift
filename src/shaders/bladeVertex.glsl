uniform float uHeight;
uniform float uMaxBendAngle;

attribute float aBendAmount;

varying vec2 vUv;

void main() {
  vUv = uv;

  float bendAmount = clamp(aBendAmount, 0.0, 1.0);
  float normalizedY = clamp((position.y + (uHeight * 0.5)) / uHeight, 0.0, 1.0);
  float bendAngle = uMaxBendAngle * bendAmount * normalizedY;

  float cosTheta = cos(bendAngle);
  float sinTheta = sin(bendAngle);

  vec3 transformed = position;
  transformed.y = (normalizedY * uHeight) - (uHeight * 0.5);

  float offset = (1.0 - normalizedY) * uHeight * 0.1;
  transformed.z += sinTheta * offset;
  transformed.y = cosTheta * transformed.y;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
