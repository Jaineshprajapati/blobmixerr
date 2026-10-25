#include simplexNoise4d.glsl
attribute vec3 tangent;

uniform float uTime;
uniform float uPositionFrequency;
uniform float uPositionStrength;
uniform float uTimeFrequency;

uniform float uSmallWavePositionFrequency;
uniform float uSmallWavePositionStrength;
uniform float uSmallWaveTimeFrequency;

// New shape controls
uniform float uTwist;          // twists the noise domain around the Y axis (0 = off)
uniform float uRingFrequency;  // stripes along Y (0 = off)
uniform float uRingStrength;

// Passed to the fragment shader so colour can follow the shape
varying float vBlobDisp;
varying vec3 vBlobNormal;

float getBlob(vec3 position) {
    // Twist the sampling domain: gives swirling, folded ribbons
    float a = position.y * uTwist;
    float c = cos(a);
    float s = sin(a);
    vec3 p = vec3(c * position.x - s * position.z, position.y, s * position.x + c * position.z);

    // Large-scale warp (changes WHERE we sample, not how tall the bumps are)
    vec3 wrappedPosition = p;
    wrappedPosition += simplexNoise4d(vec4(p * uPositionFrequency, uTime * uTimeFrequency)) * uPositionStrength;

    // Displacement height: this is the only term that moves the surface
    float blob = simplexNoise4d(vec4(wrappedPosition * uSmallWavePositionFrequency, uTime * uSmallWaveTimeFrequency)) * uSmallWavePositionStrength;

    // Optional wavy stripes along Y
    blob += sin(wrappedPosition.y * uRingFrequency) * uRingStrength;

    return blob;
}

void main() {
    vec3 bitangent = cross(tangent.xyz, normal);

    float shift = 0.07;
    vec3 A = csm_Position + shift * tangent.xyz;
    vec3 B = csm_Position + shift * bitangent;

    float blob = getBlob(csm_Position);
    csm_Position += blob * normal;

    A += getBlob(A) * normal;
    B += getBlob(B) * normal;

    vec3 shadowA = normalize(A - csm_Position);
    vec3 shadowB = normalize(B - csm_Position);

    csm_Normal = -cross(shadowA, shadowB);

    vBlobDisp = blob;
    vBlobNormal = csm_Normal;
}
