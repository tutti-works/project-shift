uniform vec3 uColor;
uniform vec3 uAmbientColor;
uniform float uAmbientIntensity;
uniform vec3 uLightColor;
uniform float uLightIntensity;
uniform vec3 uLightDirection;
uniform float uSpecularIntensity;
uniform float uSpecularPower;

varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 normal = normalize(vWorldNormal);
  vec3 lightDir = normalize(-uLightDirection);
  float diffuseStrength = max(dot(normal, lightDir), 0.0);
  vec3 diffuse = uColor * uLightColor * diffuseStrength * uLightIntensity;

  vec3 ambient = uColor * uAmbientColor * uAmbientIntensity;

  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  vec3 halfVector = normalize(lightDir + viewDir);
  float spec = pow(max(dot(normal, halfVector), 0.0), uSpecularPower) * uSpecularIntensity;
  vec3 specular = uLightColor * spec;

  vec3 finalColor = ambient + diffuse + specular;
  finalColor = clamp(finalColor, 0.0, 1.0);

  gl_FragColor = vec4(finalColor, 1.0);
}
