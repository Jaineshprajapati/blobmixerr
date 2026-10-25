// Colour follows the SHAPE (bumps + surface direction) instead of the UV map,
// so gradients flow across folds and ridges like the Blobmixer reference.

uniform sampler2D uGradient;
uniform sampler2D uGradientNext;
uniform float uGradientMix;   // 0 -> current gradient, 1 -> next (smooth crossfade)

uniform float uColorBlob;     // how strongly bump height drives colour
uniform float uColorNormal;   // how strongly surface direction drives colour
uniform float uColorShift;    // slides the whole gradient

varying float vBlobDisp;
varying vec3 vBlobNormal;

// Ping-pong lookup: seamless for any gradient image, cyclic or not
vec3 gradient(sampler2D tex, float t) {
    float p = abs(fract(t * 0.5) * 2.0 - 1.0);
    return texture2D(tex, vec2(p, p)).rgb;
}

void main() {
    vec3 n = normalize(vBlobNormal);
    float t = uColorShift
            + vBlobDisp * uColorBlob
            + dot(n, normalize(vec3(0.35, 0.85, 0.4))) * uColorNormal;

    vec3 col = mix(gradient(uGradient, t), gradient(uGradientNext, t), uGradientMix);
    csm_DiffuseColor = vec4(col, 1.0);
}
