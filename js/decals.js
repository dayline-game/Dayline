/* DAYLINE — animated decals (Rocket League style): a time-driven shader overlay on the car's paint.
   The effect is injected into the body material, so it follows the livery, the finish and the lighting. DL.decalTime is advanced by the render loop. */
(function (DL) {
  'use strict';
  DL.decalTime = { value: 0 };
  // id: [name, effect, colour 1, colour 2, variant, price]
  DL.DECALS = {
    inferno:  ['Inferno', 0, 0xffd23a, 0xff3b0a, 0, 480],
    blueflame: ['Blue flame', 0, 0xd8f4ff, 0x1f6bff, 0, 520],
    hellfire: ['Hellfire', 0, 0xff9b3a, 0x9b1fd6, 0, 560],
    volt:     ['Volt', 1, 0xffffff, 0x2fd6ff, 0, 460],
    storm:    ['Storm', 1, 0xffd9ff, 0xa63bff, 0, 500],
    nebula:   ['Nebula', 2, 0x7a3bff, 0x1fb6ff, 0, 640],
    aurora:   ['Aurora', 2, 0x2fffa8, 0x3a6bff, 0, 640],
    rainbow:  ['Rainbow flow', 3, 0xffffff, 0xffffff, 1, 560],
    sunset:   ['Sunset flow', 3, 0xffb13a, 0xff2f8f, 0, 420],
    ocean:    ['Ocean flow', 3, 0x2fffe0, 0x2a52ff, 0, 420],
    synth:    ['Synthwave', 4, 0xff2fd0, 0x2fe8ff, 0, 520],
    matrix:   ['Matrix', 4, 0x3dff6a, 0x0a5a24, 0, 520],
    glitch:   ['Glitch', 5, 0x2fe8ff, 0xff2f6a, 0, 440],
    stardust: ['Stardust', 6, 0xffe27a, 0xffffff, 0, 400],
    frost:    ['Frost sparkle', 6, 0xbfeaff, 0xffffff, 0, 400],
    tidal:    ['Tidal', 7, 0x1fd6c0, 0xe8fffb, 0, 380],
    lava:     ['Lava tide', 7, 0xff6a1f, 0xffe27a, 0, 380],
    chase:    ['Light chase', 8, 0x2fe8ff, 0xffffff, 0, 360],
    redchase: ['Red chase', 8, 0xff2f3a, 0xffffff, 0, 360],
    shield:   ['Energy shield', 9, 0x2fd6ff, 0x2a52ff, 0, 600],
    goldshield: ['Gold shield', 9, 0xffd23a, 0xff8a1f, 0, 700]
  };
  DL.DECAL_FX = ['Flames', 'Lightning', 'Galaxy', 'Flow', 'Neon grid', 'Glitch', 'Sparkle', 'Waves', 'Light chase', 'Shield'];

  const FRAG_FN = `
varying vec3 vDecP; varying vec3 vDecN;
uniform float uDecT; uniform float uDecFx; uniform float uDecV; uniform vec3 uDecC1; uniform vec3 uDecC2;
float dHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float dNoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(dHash(i), dHash(i + vec2(1.0, 0.0)), f.x), mix(dHash(i + vec2(0.0, 1.0)), dHash(i + vec2(1.0, 1.0)), f.x), f.y); }
float dFbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * dNoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
vec3 dHsv(float h, float s, float v){ vec3 k = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); return v * mix(vec3(1.0), k, s); }
// returns rgb in .rgb, strength in .a ; glow written to dGlow
float dGlow;
float aa(float d, float w){ return smoothstep(w, -w, d); }           // anti-aliased edge: d<0 is inside
float tongue(float x, float y, float seed, float t, float hmax){      // one flame tongue: returns signed distance (negative inside)
  float cell = floor(x), f = fract(x) - 0.5, r = dHash(vec2(cell, seed));
  float h = hmax * (0.45 + 0.55 * r) * (0.85 + 0.15 * sin(t * 6.0 + cell * 7.0 + seed));
  f += sin(y * 5.0 - t * 4.0 + cell * 2.3) * 0.09 * (y / hmax);
  float w = 0.54 * (1.0 - pow(clamp(y / h, 0.0, 1.0), 1.7));
  return max(abs(f) - w, y - h) * 0.9;
}
vec4 decalFx(vec3 p0, vec3 n, float t, int fx){
  // surface coordinates that stay continuous on every face: sides use (z, y), top faces (z, x), front/back (x, y)
  float side, topM = 0.0; vec2 uv;
  if (abs(n.y) > 0.6) { uv = vec2(p0.z, p0.x * 1.6 + 2.3); side = 3.0; topM = 1.0; }
  else if (abs(n.x) > abs(n.z)) { uv = vec2(p0.z, p0.y); side = n.x < 0.0 ? -1.0 : 1.0; }
  else { uv = vec2(p0.x * 1.3 + 5.0, p0.y); side = n.z < 0.0 ? -2.0 : 2.0; }
  vec3 p = vec3(0.0, uv.y, uv.x); dGlow = 0.6;
  if (fx == 0) {                                   // layered flame tongues rising from the sills
    float y = uv.y - 0.12, x = uv.x * 2.4 + side * 4.7, aw = 0.025;
    float d1 = tongue(x, y, 1.0, t, 1.0), d2 = tongue(x * 1.35 + 0.4, y, 2.0, t * 1.2, 0.8), d3 = tongue(x * 1.9 + 0.2, y, 3.0, t * 1.5, 0.55);
    float base = aa(y - 0.05, aw);
    float o = max(aa(d1, aw), base), m = aa(d2, aw), c = aa(d3, aw);
    vec3 col = mix(uDecC2, mix(uDecC2, uDecC1, 0.55), m); col = mix(col, uDecC1, c); col = mix(col, vec3(1.0), c * 0.35);
    dGlow = 1.3; return vec4(col, max(o, max(m, c)) * step(0.0, y));
  }
  if (fx == 1) {                                   // jagged lightning bolts that flash on and off
    float acc = 0.0, glow = 0.0, y = uv.y;
    for (int i = 0; i < 3; i++) {
      float fi = float(i), slot = floor(t * 4.0 + fi * 1.7), on = step(0.28, dHash(vec2(slot, fi + 3.0)));
      float x = uv.x * 0.55 + fi * 0.37 + dHash(vec2(slot, fi)) * 4.0, lane = floor(x), fx0 = fract(x) - 0.5;
      float disp = (dNoise(vec2(y * 7.0 + lane * 9.0 + fi * 13.0, slot * 1.3)) - 0.5) * 0.7 + (dNoise(vec2(y * 21.0 + lane, slot)) - 0.5) * 0.18;
      float d = abs(fx0 - disp), taper = smoothstep(0.0, 0.1, y) * (1.0 - smoothstep(1.0, 1.35, y));
      acc = max(acc, aa(d - 0.014, 0.012) * on * taper); glow = max(glow, (1.0 - smoothstep(0.0, 0.22, d)) * on * taper * 0.55);
    }
    dGlow = 1.8; return vec4(mix(uDecC2, uDecC1, acc), max(acc, glow));
  }
  if (fx == 2) {                                   // swirling nebula with twinkling stars
    vec2 q = uv * vec2(0.55, 0.8) + vec2(side * 1.7, 0.0);
    float w = dFbm(q * 3.0 - vec2(t * 0.06, -t * 0.04));
    float n = dFbm(q * 2.0 + w * 1.6 + vec2(t * 0.05, -t * 0.03));
    vec3 c = mix(uDecC1, uDecC2, n) * (0.45 + 1.1 * n);
    vec2 cell = floor(uv * vec2(16.0) + side * 7.0); float hh = dHash(cell);
    float star = step(0.94, hh) * (0.4 + 0.6 * sin(t * 3.0 + hh * 60.0));
    c += vec3(star);
    dGlow = 0.8; return vec4(c, 0.86);
  }
  if (fx == 3) {                                   // bold two-tone stripes flowing front to back
    float ph = (p.z * 0.9 + p.y * 1.1 + side * 0.4) * 0.55 - t * 0.32;
    float st = fract(ph * 2.0), band = aa(abs(st - 0.5) - 0.28, 0.02), rim = aa(abs(st - 0.5) - 0.28, 0.02) - aa(abs(st - 0.5) - 0.22, 0.02);
    vec3 c = uDecV > 0.5 ? dHsv(fract(ph * 0.8), 0.8, 1.0) : mix(uDecC1, uDecC2, 0.5 + 0.5 * sin(6.2831 * ph));
    dGlow = 0.6; return vec4(mix(c, vec3(1.0), rim * 0.7), band * 0.82);
  }
  if (fx == 4) {                                   // scrolling neon grid with a pulse
    vec2 g = vec2(p.z * 2.2 - t * 0.7, p.y * 3.2);
    vec2 f = abs(fract(g) - 0.5);
    float line = smoothstep(0.43, 0.5, max(f.x, f.y));
    float pulse = 0.45 + 0.55 * sin(t * 2.2 + p.z * 2.4);
    float sweep = smoothstep(0.0, 0.06, 0.06 - abs(fract(p.z * 0.22 - t * 0.35) - 0.5) + 0.44);
    float s = line * (0.55 + 0.45 * pulse);
    dGlow = 1.3; return vec4(mix(uDecC1, uDecC2, fract(p.y * 1.4 + t * 0.2)), s);
  }
  if (fx == 5) {                                   // digital glitch bars
    float row = floor(p.y * 17.0), tt = floor(t * 7.0);
    float on = step(0.82, dHash(vec2(row, tt)));
    float seg = step(0.5, dHash(vec2(floor(p.z * 3.0 + dHash(vec2(row, tt + 3.0)) * 9.0), row + tt)));
    float scan = step(0.55, fract(p.y * 46.0 - t * 2.0)) * 0.12;
    float s = max(on * seg * 0.9, scan);
    vec3 c = mix(uDecC1, uDecC2, step(0.5, dHash(vec2(row + 7.0, tt))));
    dGlow = 1.0; return vec4(c, s);
  }
  if (fx == 6) {                                   // glitter: little four-point star flares twinkling
    float a = 0.0; vec3 col = vec3(1.0);
    for (int i = 0; i < 2; i++) {
      float sc = i == 0 ? 7.0 : 12.0;
      vec2 q = uv * sc + side * 9.0 + float(i) * 31.0, c = floor(q), f = fract(q) - 0.5;
      float hh = dHash(c + float(i) * 17.0), hh2 = dHash(c + 41.0);
      f -= (vec2(hh, hh2) - 0.5) * 0.5;
      float tw = pow(max(0.0, sin(t * 3.4 + hh * 60.0)), 3.0) * step(0.5, hh2);
      float cross = exp(-abs(f.x) * 55.0) * exp(-abs(f.y) * 7.0) + exp(-abs(f.y) * 55.0) * exp(-abs(f.x) * 7.0) + exp(-length(f) * 26.0);
      a = max(a, clamp(cross * tw, 0.0, 1.0)); col = mix(uDecC1, uDecC2, hh);
    }
    dGlow = 1.9; return vec4(col, a);
  }
  if (fx == 7) {                                   // layered rolling waves with foam crests
    float a = 0.0, foam = 0.0; vec3 col = uDecC1;
    for (int i = 0; i < 3; i++) {
      float fi = float(i), yl = 0.34 + fi * 0.22 + 0.07 * sin(uv.x * (3.6 + fi * 1.1) - t * (1.6 + fi * 0.7) + fi * 2.0);
      float crest = aa(abs(uv.y - yl) - 0.022, 0.012), body = aa(uv.y - yl, 0.012) * (0.22 - fi * 0.05);
      a = max(a, max(crest * 0.95, body)); foam = max(foam, crest);
    }
    dGlow = 0.8; return vec4(mix(uDecC1, uDecC2, foam), a);
  }
  if (fx == 8) {                                   // light chase along the bonnet, roof and boot
    float ax = abs(p0.x);
    float stripe = max(1.0 - smoothstep(0.0, 0.03, abs(ax - 0.3) - 0.07), 1.0 - smoothstep(0.0, 0.03, ax - 0.07)) * topM;
    float ch = fract(-p.z * 0.33 + t * 0.7);
    float head = smoothstep(0.0, 0.03, ch) * (1.0 - smoothstep(0.03, 0.55, ch));
    float sideLine = (1.0 - smoothstep(0.0, 0.03, abs(p.y - 0.62) - 0.035)) * step(0.7, ax) * (1.0 - topM);
    float s = max(stripe * (0.2 + 0.8 * head), sideLine * (0.2 + 0.8 * head));
    dGlow = 1.8; return vec4(mix(uDecC1, uDecC2, head), s);
  }
  // 9: hex energy shield with ripples
  vec2 hp = uv * 2.4 + vec2(side * 1.3, 0.0);
  vec2 r = vec2(1.0, 1.7320508), hf = r * 0.5;
  vec2 a = mod(hp, r) - hf, b = mod(hp - hf, r) - hf;
  vec2 gv = dot(a, a) < dot(b, b) ? a : b;
  float hd = max(dot(abs(gv), normalize(vec2(1.0, 1.7320508))), abs(gv.x));
  float edge = smoothstep(0.38, 0.47, hd);
  float rip = 0.5 + 0.5 * sin(length(uv - vec2(sin(t * 0.35) * 1.8, 0.7)) * 4.0 - t * 3.0);
  float s = edge * (0.3 + 0.7 * rip) + (1.0 - edge) * 0.06 * rip;
  dGlow = 1.2; return vec4(mix(uDecC1, uDecC2, rip), s);
}`;

  // inject the decal into a standard/physical material
  DL.applyDecal = function (mat, id) {
    const d = DL.DECALS[id]; if (!d) return mat;
    const u = { uDecT: DL.decalTime, uDecFx: { value: d[1] }, uDecV: { value: d[4] }, uDecC1: { value: new THREE.Color(d[2]) }, uDecC2: { value: new THREE.Color(d[3]) } };
    mat.userData.decal = id;
    mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = 'varying vec3 vDecP; varying vec3 vDecN;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvDecP = position; vDecN = normal;');
      sh.fragmentShader = FRAG_FN + "\n" + sh.fragmentShader
        .replace('#include <map_fragment>', '#include <map_fragment>\nvec4 dfx = decalFx(vDecP, normalize(vDecN), uDecT, int(uDecFx + 0.5)); diffuseColor.rgb = mix(diffuseColor.rgb, dfx.rgb, clamp(dfx.a, 0.0, 1.0));')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += dfx.rgb * dfx.a * dGlow * 0.75;');
    };
    mat.customProgramCacheKey = () => 'decal';
    mat.needsUpdate = true;
    return mat;
  };
})(window.DL);
