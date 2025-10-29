uniform float uHeight;
uniform float uBendAmount;
uniform float uMaxBendAngle;

varying vec2 vUv;

void main() {
  vUv = uv;

  float bendAmount = clamp(uBendAmount, 0.0, 1.0);
  float normalizedY = clamp((position.y + (uHeight * 0.5)) / uHeight, 0.0, 1.0);
  float theta = uMaxBendAngle * bendAmount;
  vec3 transformed = position;

  if (theta > 0.0001) {
    float radius = uHeight / theta;
    float angle = theta * normalizedY;
    float yFromBase = radius * sin(angle);
    float zOffset = radius * (1.0 - cos(angle));

    transformed.y = yFromBase - (uHeight * 0.5);
    transformed.z = position.z + zOffset;
  }

  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
