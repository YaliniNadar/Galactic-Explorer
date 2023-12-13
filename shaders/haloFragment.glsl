uniform sampler2D sunTexture;
varying vec2 vUV;
varying vec3 vertexNormal;
uniform vec3 lightPosition;
varying vec3 viewFragmentPosition;

void main() {
    vec3 lightDirection = normalize(lightPosition - viewFragmentPosition);

    // Calculate the intensity based on the dot product of the normal and light direction
    float intensity = pow(max(0.0, dot(vertexNormal, lightDirection)), 2.0);

    // Adjust the intensity based on distance
    float distance = length(lightPosition - viewFragmentPosition);

    float falloffStart = 0.0;
    float falloffEnd = 20.0;

    float falloff = smoothstep(0.0, 1.0, (distance - falloffStart) / (falloffEnd - falloffStart));
//    intensity *= falloff;

    intensity *= 1.5;

    float edgeSoftness = 0.1;  // Adjust as needed
    float softIntensity = smoothstep(0.0, 1.0, intensity);

    vec3 color = vec3(1.0, 0.8, 0.2);
    gl_FragColor = vec4(color * softIntensity, 1);
}





