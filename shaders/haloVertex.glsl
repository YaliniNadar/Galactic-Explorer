varying vec3 vertexNormal;
varying vec3 viewFragmentPosition;
varying vec2 vUV;

void main() {

    vUV = uv;
    vec4 viewPosition = viewMatrix * modelMatrix * vec4(position, 1.0);
    viewFragmentPosition = viewPosition.xyz / viewPosition.w;

    vertexNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}