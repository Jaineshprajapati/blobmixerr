uniform float progress;
uniform float direction;
uniform float uWave;   // 0 = still water ... ~2 = big swell (driven by how hard you scroll)
uniform float uPhase;  // wave position; advances over time in the scroll direction

#define PI 3.1415926538

vec3 rotateAxis(vec3 p, vec3 axis, float angle) {
    return mix(dot(axis, p) * axis, p, cos(angle)) + cross(axis, p) * sin(angle);
}

void main() {
    vec3 pos = position;

    // Original flip / twirl between titles (unchanged)
    float twirlPeriod = sin(progress * PI * 2.);

    float rotateAngle = -direction * pow(sin(progress * PI), 1.5) * PI * 2.;

    float twirlAngle = -sin(uv.x - .5) * pow(twirlPeriod, 2.0) * -4.;

    float twirlRotate = rotateAngle + twirlAngle;

    pos = rotateAxis(pos, vec3(1., 0., 0.), twirlRotate);

    vec4 clip = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

    // Water: one wave field in screen space that every title floats on. Working in
    // normalised screen coordinates keeps it identical at any font size or screen.
    vec2 s = clip.xy / clip.w;

    // long swells plus a finer ripple travelling the same way
    float swell = sin(s.x * 3.4 - uPhase * 2.2) * 0.65
                + sin(s.x * 7.8 - uPhase * 3.6 + s.y * 2.5) * 0.35;
    float sway = sin(s.y * 6.0 + uPhase * 1.4);

    s.y += swell * 0.045 * uWave; // up and down: 0.045 = 2.2% of screen height at uWave = 1
    s.x += sway * 0.010 * uWave;  // slight sideways drift

    clip.xy = s * clip.w;
    gl_Position = clip;
}
