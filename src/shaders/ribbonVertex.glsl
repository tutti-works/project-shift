uniform float uHeight;
uniform float uMaxTwistAngle;

attribute float aTwistAmount;

varying vec2 vUv;

void main() {
  vUv = uv;

  float twistAmount = clamp(aTwistAmount, 0.0, 1.0);
  float normalizedY = clamp((position.y + (uHeight * 0.5)) / uHeight, 0.0, 1.0);
  float twistAngle = uMaxTwistAngle * twistAmount * (1.0 - normalizedY);

  float cosTheta = cos(twistAngle);
  float sinTheta = sin(twistAngle);

  vec3 transformed = position;
  transformed.x = position.x * cosTheta - position.z * sinTheta;
  transformed.z = position.x * sinTheta + position.z * cosTheta;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
