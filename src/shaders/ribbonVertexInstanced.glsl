uniform float uHeight;
uniform float uTwistAngleAtRest;
uniform float uTwistAngleAtMax;
uniform float uBendAmount;

attribute float aTwistAmount;

varying vec2 vUv;

void main() {
  vUv = uv;

  float bendAmount = clamp(aTwistAmount, 0.0, 1.0);
  float normalizedY = clamp((position.y + (uHeight * 0.5)) / uHeight, 0.0, 1.0);
  float rootAngle = mix(uTwistAngleAtRest, uTwistAngleAtMax, bendAmount);
  float twistAngle = rootAngle * (1.0 - normalizedY);

  float cosTheta = cos(twistAngle);
  float sinTheta = sin(twistAngle);

  vec3 transformed = position;
  transformed.x = position.x * cosTheta - position.z * sinTheta;
  transformed.z = position.x * sinTheta + position.z * cosTheta;

  mat4 modelInstanceMatrix = modelMatrix * instanceMatrix;
  vec4 worldPosition = modelInstanceMatrix * vec4(transformed, 1.0);
  vec4 viewPosition = viewMatrix * worldPosition;

  gl_Position = projectionMatrix * viewPosition;
}
