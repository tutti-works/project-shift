uniform float uHeight;
uniform float uMaxBendAngle;

attribute float aBendAmount;

varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;

  float bendAmount = clamp(aBendAmount, 0.0, 1.0);
  float theta = uMaxBendAngle * bendAmount;
  vec3 transformed = position;
  float cosAngle = 1.0;
  float sinAngle = 0.0;

  if (theta > 0.0001) {
    float normalizedY = clamp((position.y + (uHeight * 0.5)) / uHeight, 0.0, 1.0);
    float radius = uHeight / theta;
    float angle = theta * normalizedY;
    cosAngle = cos(angle);
    sinAngle = sin(angle);
    float yFromBase = radius * sinAngle;
    float zOffset = radius * (1.0 - cosAngle);

    transformed.y = yFromBase - (uHeight * 0.5);
    transformed.z = position.z + zOffset;
  }

  float safeCos = abs(cosAngle) > 1e-4 ? cosAngle : (cosAngle >= 0.0 ? 1e-4 : -1e-4);
  float invCos = 1.0 / safeCos;
  float tanAngle = sinAngle * invCos;

  mat3 jacobianInvTranspose = mat3(
    1.0,    0.0,        0.0,
    0.0,    invCos,     0.0,
    0.0,   -tanAngle,   1.0
  );

  vec3 bentNormal = normalize(jacobianInvTranspose * normal);
  vec4 localPosition = vec4(transformed, 1.0);

#ifdef USE_INSTANCING
  mat3 instanceMat3 = mat3(instanceMatrix);
  localPosition = instanceMatrix * localPosition;
  bentNormal = normalize(instanceMat3 * bentNormal);
#endif

  vec4 worldPosition = modelMatrix * localPosition;
  vWorldPosition = worldPosition.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * bentNormal);

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
