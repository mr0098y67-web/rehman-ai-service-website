/* Rehman AI Services — AI World Simulation (demo).
   Inspired by real-time "world model" demos such as Google DeepMind's Genie 4.
   This is NOT Genie 4: it is a hand-built Three.js scene that runs fully in the browser. */
import * as THREE from './three.module.min.js';

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

const ZONES = {
  hub:    { name: 'Rehman AI Services World', color: 0x8b5cf6, angle: 0, r: 0,
            text: 'Khush aamdeed! Ye hamari services ki 3D duniya hai. Neeche kisi zone par tap karein, ya screen ko drag kar ke khud ghoomein.' },
  photo:  { name: 'AI Photos & Videos', color: 0x22d3ee, angle: -Math.PI * 0.25, r: 17,
            text: 'Aap ka idea, AI ki taaqat: hum product shots, ads aur reels ke liye professional AI photos aur videos banate hain.' },
  edit:   { name: 'Video Editing', color: 0xf6c453, angle: Math.PI * 0.25, r: 17,
            text: 'Raw clips ko cut, transitions, color aur sound ke saath ek saaf, polished video mein badal dete hain.' },
  auto:   { name: 'n8n + Make.com Automation', short: 'n8n + Make Automation', color: 0x5ee0a0, angle: Math.PI * 0.75, r: 17,
            text: 'Roz ke repeat kaam automatic: WhatsApp replies, leads, emails aur posts. Workflows jo 24/7 khud chalte hain.' },
  course: { name: 'AI Automation Mukammal Course', short: 'AI Courses', color: 0xff6fb5, angle: -Math.PI * 0.75, r: 17,
            text: 'AI aur automation step by step seekhein, aasaan Urdu mein. Shuru se le kar apne workflows banane tak.' },
};
const ORDER = ['hub', 'photo', 'edit', 'auto', 'course'];

const KEYWORDS = [
  ['photo', ['photo', 'tasveer', 'tasvir', 'image', 'pic', 'ai video', 'video bana', 'reel', 'ad ', 'ads', 'thumbnail', 'generate']],
  ['edit', ['edit', 'editing', 'cut', 'timeline', 'capcut', 'premiere', 'video editing']],
  ['auto', ['auto', 'automation', 'n8n', 'make', 'workflow', 'bot', 'whatsapp', 'zapier', 'agent']],
  ['course', ['course', 'cours', 'seekh', 'sikh', 'class', 'parh', 'learn', 'mukammal', 'training', 'sabaq']],
  ['hub', ['home', 'hub', 'start', 'shuru', 'center', 'markaz', 'rehman']],
];
const FX_WORDS = [
  ['night', ['raat', 'night', 'andhera', 'shaam']],
  ['day', ['din', 'day', 'subah', 'roshni', 'dhoop']],
  ['rain', ['barish', 'baarish', 'rain', 'tufan', 'toofan', 'storm']],
  ['clear', ['saaf', 'clear', 'band', 'stop']],
  ['tour', ['tour', 'ghoom', 'sab dikhao', 'auto tour']],
];

function isMobile() { return matchMedia('(pointer:coarse)').matches || Math.min(screen.width, screen.height) < 760; }

/* ---------- small texture helpers ---------- */
function glowTexture(inner = 'rgba(255,255,255,1)') {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, inner); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function labelSprite(text, color = '#ffffff', scale = 1) {
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  const fs = 46; g.font = `700 ${fs}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  const w = Math.ceil(g.measureText(text).width) + 56; c.width = w; c.height = 84;
  g.font = `700 ${fs}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  g.fillStyle = 'rgba(8,12,30,.72)'; roundRect(g, 2, 2, w - 4, 80, 40); g.fill();
  g.strokeStyle = color; g.globalAlpha = .9; g.lineWidth = 3; roundRect(g, 2, 2, w - 4, 80, 40); g.stroke(); g.globalAlpha = 1;
  g.fillStyle = '#eaf0ff'; g.textBaseline = 'middle'; g.fillText(text, 28, 44);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 2;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  const h = 0.9 * scale; s.scale.set(h * w / 84, h, 1); return s;
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function glyphSprite(text, color) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d');
  g.font = '800 64px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = color; g.shadowBlur = 18; g.fillStyle = '#fff'; g.fillText(text, 64, 66);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
}

/* ---------- shaders ---------- */
const NOISE = `
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn(p);p*=2.03;a*=.5;}return s;}`;

function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, bot: { value: new THREE.Color() }, glow: { value: new THREE.Color() }, fogC: { value: new THREE.Color() }, time: { value: 0 }, night: { value: 1 } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 top,bot,glow,fogC; uniform float time,night; varying vec3 vP; ${NOISE}
      void main(){ float h = vP.y; vec3 c = mix(bot, top, smoothstep(-.05,.6,h));
        c += glow * pow(1.-abs(h), 6.) * .55;
        vec2 uv = vec2(atan(vP.z,vP.x)*3., vP.y*6.);
        float st = step(.996, h21(floor(uv*60.))) * smoothstep(.05,.4,h) * night;
        st *= .6+.4*sin(time*2.+h21(floor(uv*60.))*40.);
        c += vec3(st);
        float aur = fbm(vec2(uv.x*.5+time*.03, h*3.))*smoothstep(.1,.45,h)*smoothstep(.85,.4,h)*night;
        c += vec3(.2,.1,.5)*aur*.5;
        c = mix(fogC, c, smoothstep(-.02,.22,h));
        gl_FragColor = vec4(c,1.); }`,
  });
}
function groundMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { time: { value: 0 }, colA: { value: new THREE.Color(0x22d3ee) }, colB: { value: new THREE.Color(0x8b5cf6) }, base: { value: new THREE.Color(0x070b1d) }, fogC: { value: new THREE.Color() } },
    vertexShader: `varying vec2 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float time; uniform vec3 colA,colB,base,fogC; varying vec2 vW;
      void main(){ vec2 g = abs(fract(vW/2.-.5)-.5)/fwidth(vW/2.);
        float line = 1.-min(min(g.x,g.y),1.);
        float d = length(vW);
        float ring = smoothstep(.25,0.,abs(d-17.))*.9 + smoothstep(.12,0.,abs(d-6.))*.5;
        float pulse = smoothstep(1.2,0.,abs(d-mod(time*7.,60.)))*.35;
        vec3 lc = mix(colA,colB,.5+.5*sin(d*.15-time*.4));
        vec3 c = base + lc*(line*.22 + ring*.55 + pulse*line*2.);
        float fade = smoothstep(70.,20.,d);
        c = mix(fogC, c, fade);
        gl_FragColor = vec4(c, 1.); }`,
    extensions: { derivatives: true },
  });
}
function aiFrameMaterial(seed, tint) {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, seed: { value: seed }, tint: { value: new THREE.Color(tint) }, play: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float time,seed,play; uniform vec3 tint; varying vec2 vUv; ${NOISE}
      vec3 scene(vec2 uv, float k){
        vec3 sky = mix(vec3(.98,.55,.35), vec3(.25,.2,.6), uv.y);
        sky = mix(sky, mix(vec3(.1,.7,.9),vec3(.05,.1,.35),uv.y), step(.5, fract(k*1.7)));
        vec2 sp = vec2(.3+.4*fract(k*3.1), .62);
        sky += vec3(1.,.85,.6)*smoothstep(.13,.0,length((uv-sp)*vec2(1.,1.3)));
        float m1 = .38+.12*fbm(vec2(uv.x*3.+k*9.,k)); float m2 = .25+.1*fbm(vec2(uv.x*5.+k*4.,2.));
        vec3 c = sky;
        c = mix(c, mix(tint*.6,vec3(.12,.1,.25),.4), step(uv.y,m1));
        c = mix(c, vec3(.05,.06,.14)+tint*.15, step(uv.y,m2));
        return c; }
      void main(){
        float cyc = 6.5; float t = time + seed*2.3; float ph = mod(t, cyc)/cyc; float k = floor(t/cyc)+seed;
        vec2 uv = vUv; if(play>.5){ uv.x += time*.02; }
        vec3 img = scene(fract(uv), k);
        float n = fbm(vUv*14. + t*3.);
        vec3 noisy = mix(vec3(n), tint, .35) * (.5+.5*h21(floor(vUv*64.)+floor(t*12.)));
        float reveal = smoothstep(.1,.75,ph);
        float edge = 1.-vUv.y;
        float m = smoothstep(edge-.06, edge, reveal);
        vec3 c = mix(noisy*.7, img, m);
        c += tint*smoothstep(.03,0.,abs(edge-reveal))*1.2*(1.-step(.99,reveal));
        c *= smoothstep(1.,.85,ph)*.6+.4*1.+.0;
        c = mix(c, noisy*.5, smoothstep(.9,1.,ph));
        if(play>.5){ vec2 p=(vUv-vec2(.5))*vec2(1.6,1.); float tri = step(p.x,.08)*step(-.05,p.x)*step(abs(p.y), (.08-p.x)*.8);
          c = mix(c, vec3(1.), tri*.85*m); }
        float b = step(.02,vUv.x)*step(vUv.x,.98)*step(.02,vUv.y)*step(vUv.y,.98);
        c = mix(tint*1.3, c, b);
        gl_FragColor = vec4(c,1.); }`,
  });
}
function screenMaterial(tint) {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, tint: { value: new THREE.Color(tint) }, prog: { value: 0 }, flash: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float time,prog,flash; uniform vec3 tint; varying vec2 vUv; ${NOISE}
      void main(){ vec2 uv=vUv; float shot = floor(time/2.2);
        vec3 a = mix(vec3(.08,.1,.3), tint, fbm(uv*3.+vec2(time*.15, shot)));
        float sub = smoothstep(.36,.34,length((uv-vec2(.5+.2*sin(shot*2.1+time*.4),.48))*vec2(1.7,1.)));
        a = mix(a, vec3(.95,.9,.85)*(.7+.3*fbm(uv*8.+shot)), sub*.85);
        a *= .65 + .35*smoothstep(0.,.25,mod(time,2.2));
        a += flash*.8;
        float bar = step(uv.y,.06)*step(.04,uv.y);
        a = mix(a, vec3(.2), bar*.8); a = mix(a, tint*1.4, bar*step(uv.x,prog));
        float b = step(.012,uv.x)*step(uv.x,.988)*step(.02,uv.y)*step(uv.y,.98);
        a = mix(vec3(.05), a, b);
        gl_FragColor = vec4(a,1.); }`,
  });
}

/* ---------- the world ---------- */
export function mount(root, opts = {}) {
  const canvas = root.querySelector('canvas.aiw-canvas');
  const mobile = isMobile();
  const standalone = !!opts.standalone;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile || devicePixelRatio < 2, powerPreference: 'high-performance', alpha: false });
  } catch (e) { root.classList.add('aiw-nowebgl'); root.classList.remove('aiw-loading-on'); return null; }
  let maxDpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75);
  let dpr = maxDpr; renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
  const fog = new THREE.FogExp2(0x070b1d, 0.018); scene.fog = fog;

  const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), skyMaterial()); scene.add(sky);
  const groundMat = groundMaterial();
  const ground = new THREE.Mesh(new THREE.CircleGeometry(90, 64), groundMat); ground.rotation.x = -Math.PI / 2; scene.add(ground);

  const hemi = new THREE.HemisphereLight(0x8fb6ff, 0x120a2a, 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.8); sun.position.set(10, 20, 8); scene.add(sun);

  const glowTex = glowTexture();
  const glow = (color, size, opacity = 0.9) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.setScalar(size); return s; };

  const updaters = [];
  const pickables = [];
  const zonePos = {};

  /* hub */
  {
    const g = new THREE.Group(); scene.add(g);
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 0.5, 48), new THREE.MeshPhongMaterial({ color: 0x0d1430, emissive: 0x120a33, shininess: 60 }));
    plat.position.y = 0.25; g.add(plat);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(4.3, 0.06, 8, 96), new THREE.MeshBasicMaterial({ color: 0x8b5cf6 })); rim.rotation.x = Math.PI / 2; rim.position.y = 0.52; g.add(rim);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 1), new THREE.MeshPhongMaterial({ color: 0x22d3ee, emissive: 0x0b4a63, flatShading: true, shininess: 100 }));
    core.position.y = 3.6; g.add(core);
    const wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.1, 1)), new THREE.LineBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: .7 }));
    wire.position.y = 3.6; g.add(wire);
    const rings = [];
    for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(2.8 + i * .55, .035, 6, 80), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x22d3ee : 0x8b5cf6, transparent: true, opacity: .85 })); r.position.y = 3.6; g.add(r); rings.push(r); }
    const halo = glow(0x6d5cff, 9, .55); halo.position.y = 3.6; g.add(halo);
    const lab = labelSprite('Rehman AI Services', '#8b5cf6', mobile ? 1.7 : 1.35); lab.position.set(0, 7.4, 0); g.add(lab);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(3.2, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 3; hit.userData.zone = 'hub'; g.add(hit); pickables.push(hit);
    updaters.push((t) => {
      core.rotation.y = t * .5; core.rotation.x = t * .3; wire.rotation.y = -t * .25; wire.rotation.z = t * .15;
      core.position.y = wire.position.y = halo.position.y = 3.6 + Math.sin(t * 1.3) * .25;
      rings.forEach((r, i) => { r.position.y = core.position.y; r.rotation.x = Math.PI / 2 + Math.sin(t * .6 + i) * .6; r.rotation.y = t * (.4 + i * .25); });
      halo.material.opacity = .45 + Math.sin(t * 2) * .1;
    });
    zonePos.hub = new THREE.Vector3(0, 0, 0);
  }

  /* zone scaffolding */
  function makeZone(key) {
    const z = ZONES[key];
    const pos = new THREE.Vector3(Math.sin(z.angle) * z.r, 0, -Math.cos(z.angle) * z.r);
    zonePos[key] = pos;
    const g = new THREE.Group(); g.position.copy(pos); g.rotation.y = -z.angle; g.scale.setScalar(1.2); scene.add(g);
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5, 0.4, 6), new THREE.MeshPhongMaterial({ color: 0x0c1230, emissive: new THREE.Color(z.color).multiplyScalar(.08), shininess: 50, flatShading: true }));
    plat.position.y = .2; g.add(plat);
    const rim = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(4.65, 5.05, 0.42, 6)), new THREE.LineBasicMaterial({ color: z.color }));
    rim.position.y = .2; g.add(rim);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.6, 2.6, 14, 24, 1, true), new THREE.MeshBasicMaterial({ color: z.color, transparent: true, opacity: .07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 7; g.add(beam);
    const lab = labelSprite(z.short || z.name, '#' + new THREE.Color(z.color).getHexString(), mobile ? .8 : .9); lab.position.set(0, 6.9, 0); g.add(lab);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 7, 8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 3.5; hit.userData.zone = key; g.add(hit); pickables.push(hit);
    updaters.push((t) => { beam.material.opacity += (((active === key ? .015 : .08) + Math.sin(t * 2 + z.angle) * .015) - beam.material.opacity) * .06; });
    return g;
  }

  /* 1. AI Photos & Videos */
  {
    const g = makeZone('photo'); const mats = [];
    const n = 5;
    for (let i = 0; i < n; i++) {
      const a = (i - (n - 1) / 2) * 0.42;
      const w = i === 2 ? 3.2 : 2.2, h = i === 2 ? 2.0 : 2.75;
      const m = aiFrameMaterial(i * 1.37 + .2, [0x22d3ee, 0x8b5cf6, 0x22d3ee, 0xff6fb5, 0x5ee0a0][i]);
      if (i === 2) m.uniforms.play.value = 1;
      mats.push(m);
      const f = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      const piv = new THREE.Group(); piv.rotation.y = a; g.add(piv);
      f.position.set(0, 3.2 + (i % 2) * .5, -3.1); f.rotation.y = 0; piv.add(f);
      f.userData.base = f.position.y; f.userData.i = i;
      updaters.push((t) => { f.position.y = f.userData.base + Math.sin(t * 1.1 + i) * .18; });
    }
    // floating "AI" sparkle + lens ring
    const lens = new THREE.Mesh(new THREE.TorusGeometry(.7, .12, 10, 40), new THREE.MeshPhongMaterial({ color: 0x22d3ee, emissive: 0x0b5566 }));
    lens.position.set(0, 1.4, -.5); g.add(lens);
    const lensG = glow(0x22d3ee, 2.6, .7); lensG.position.copy(lens.position); g.add(lensG);
    const sparks = [];
    for (let i = 0; i < 10; i++) { const s = glow(i % 2 ? 0x22d3ee : 0xc4b5fd, .45, .9); g.add(s); sparks.push(s); }
    updaters.push((t) => {
      mats.forEach((m) => m.uniforms.time.value = t);
      lens.rotation.y = t; lens.rotation.x = Math.sin(t * .7) * .4;
      sparks.forEach((s, i) => { const p = (t * .25 + i / sparks.length) % 1; s.position.set(Math.sin(i * 2.4) * 2.5 * (1 - p), 1.4 + p * 4, -0.5 - p * 2.4); s.material.opacity = Math.sin(p * Math.PI); });
    });
  }

  /* 2. Video Editing */
  {
    const g = makeZone('edit');
    const scrM = screenMaterial(0xf6c453);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3.15), scrM); scr.position.set(0, 4.1, -2.6); g.add(scr);
    const bezel = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(5.75, 3.3, .1)), new THREE.LineBasicMaterial({ color: 0xf6c453 })); bezel.position.copy(scr.position); g.add(bezel);
    // timeline
    const tl = new THREE.Group(); tl.position.set(0, 1.5, -.2); tl.rotation.x = 0.75; g.add(tl);
    const base = new THREE.Mesh(new THREE.BoxGeometry(7, .08, 2.2), new THREE.MeshPhongMaterial({ color: 0x0a0f24, emissive: 0x0a0f24 })); tl.add(base);
    const cols = [0xf6c453, 0x22d3ee, 0xff6fb5, 0x8b5cf6, 0x5ee0a0];
    const clips = [];
    const tracks = [-.65, 0, .65];
    tracks.forEach((z, ti) => {
      let x = -6;
      for (let k = 0; k < 7; k++) {
        const len = .8 + ((k * 7 + ti * 3) % 5) * .35;
        const c = new THREE.Mesh(new THREE.BoxGeometry(len - .08, .14, .46), new THREE.MeshPhongMaterial({ color: cols[(k + ti) % 5], emissive: new THREE.Color(cols[(k + ti) % 5]).multiplyScalar(.35) }));
        c.userData = { x: x + len / 2, len, z }; c.position.set(0, .1, z); tl.add(c); clips.push(c); x += len;
      }
      tl.userData['w' + ti] = x + 6;
    });
    const head = new THREE.Mesh(new THREE.BoxGeometry(.05, .5, 2.3), new THREE.MeshBasicMaterial({ color: 0xffffff })); head.position.set(.6, .2, 0); tl.add(head);
    const headG = glow(0xfff1c1, 1.4, .8); headG.position.set(.6, .45, -1.15); tl.add(headG);
    const blade = glow(0xffd36b, 2.2, 0); blade.position.set(.6, .3, 0); tl.add(blade);
    let flash = 0, lastEdge = {};
    updaters.push((t, dt) => {
      scrM.uniforms.time.value = t; scrM.uniforms.prog.value = (t * .08) % 1;
      const clip = (v, w) => ((v % w) + w) % w;
      clips.forEach((c, i) => {
        const ti = tracks.indexOf(c.userData.z); const W = tl.userData['w' + ti];
        const xx = clip(c.userData.x - t * .9 * (1 + ti * .15) + 6, W) - 6;
        c.position.x = xx; c.visible = xx > -3.6 && xx < 3.6;
        const edge = xx - c.userData.len / 2; const key = i;
        const crossed = lastEdge[key] !== undefined && lastEdge[key] > .6 && edge <= .6;
        lastEdge[key] = edge;
        if (crossed && c.visible) flash = 1;
        const gap = Math.max(0, 1 - Math.abs(edge - .6) * 4);
        c.scale.y = 1 + gap * .8;
      });
      flash = Math.max(0, flash - dt * 3);
      blade.material.opacity = flash; scrM.uniforms.flash.value = flash * .25;
    });
  }

  /* 3. n8n + Make.com Automation */
  {
    const g = makeZone('auto');
    const nodes = [
      { p: [-3.4, 2.2, -1.2], t: 'WhatsApp', c: 0x5ee0a0 },
      { p: [-1.2, 3.6, -2.4], t: 'n8n', c: 0xff6d5a },
      { p: [-1.0, 1.6, -2.6], t: 'Make', c: 0xa78bfa },
      { p: [1.3, 2.7, -3.0], t: 'AI', c: 0x22d3ee },
      { p: [3.4, 4.0, -1.6], t: 'Email', c: 0xf6c453 },
      { p: [3.6, 1.6, -1.4], t: 'Sheet', c: 0x5ee0a0 },
    ];
    const meshes = nodes.map((n) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), new THREE.MeshPhongMaterial({ color: 0x0f1a36, emissive: new THREE.Color(n.c).multiplyScalar(.25), shininess: 80 }));
      m.position.set(...n.p); g.add(m);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: n.c })); m.add(e);
      const gl = glow(n.c, 2.4, .35); m.add(gl); m.userData.gl = gl; m.userData.c = n.c; m.userData.pulse = 0;
      const l = labelSprite(n.t, '#' + new THREE.Color(n.c).getHexString(), .55); l.position.set(0, 1.05, 0); m.add(l);
      return m;
    });
    const links = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5]];
    const curves = links.map(([a, b]) => {
      const A = meshes[a].position, B = meshes[b].position;
      const mid = A.clone().add(B).multiplyScalar(.5); mid.y += .8; mid.z -= .3;
      const cv = new THREE.QuadraticBezierCurve3(A.clone(), mid, B.clone());
      const tube = new THREE.Mesh(new THREE.TubeGeometry(cv, 24, .035, 5, false), new THREE.MeshBasicMaterial({ color: 0x3fd1a0, transparent: true, opacity: .55 }));
      g.add(tube); return { cv, b };
    });
    const packets = [];
    const packetCount = mobile ? 10 : 16;
    for (let i = 0; i < packetCount; i++) {
      const s = glow(i % 3 ? 0x7cffc8 : 0x22d3ee, .55, 1); g.add(s);
      const core = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); s.add(core);
      packets.push({ s, k: i % curves.length, u: (i * .37) % 1, sp: .35 + (i % 4) * .08 });
    }
    updaters.push((t, dt) => {
      packets.forEach((p) => {
        p.u += dt * p.sp;
        if (p.u >= 1) { p.u -= 1; const tgt = meshes[curves[p.k].b]; tgt.userData.pulse = 1; p.k = (p.k + 1 + Math.floor(Math.random() * 2)) % curves.length; }
        p.s.position.copy(curves[p.k].cv.getPoint(p.u));
      });
      meshes.forEach((m, i) => {
        m.userData.pulse = Math.max(0, m.userData.pulse - dt * 2.2);
        const s = 1 + m.userData.pulse * .18; m.scale.setScalar(s);
        m.rotation.y = Math.sin(t * .5 + i) * .35; m.rotation.x = Math.sin(t * .4 + i * 2) * .15;
        m.userData.gl.material.opacity = .25 + m.userData.pulse * .6;
      });
    });
  }

  /* 4. Course */
  {
    const g = makeZone('course');
    const book = new THREE.Group(); book.position.set(0, 2.0, -1.0); book.rotation.x = 0.85; book.scale.setScalar(1.25); g.add(book);
    const coverM = new THREE.MeshPhongMaterial({ color: 0x3b1460, emissive: 0x2a0b45, shininess: 40 });
    const pageM = new THREE.MeshPhongMaterial({ color: 0xf3ecff, emissive: 0x3a2a55, side: THREE.DoubleSide });
    const L = new THREE.Group(); L.rotation.z = .12; book.add(L); const R2 = new THREE.Group(); R2.rotation.z = -.12; book.add(R2);
    const cl = new THREE.Mesh(new THREE.BoxGeometry(2.3, .1, 3), coverM); cl.position.x = -1.15; L.add(cl);
    const pl = new THREE.Mesh(new THREE.BoxGeometry(2.15, .22, 2.85), pageM); pl.position.set(-1.1, .14, 0); L.add(pl);
    const cr = new THREE.Mesh(new THREE.BoxGeometry(2.3, .1, 3), coverM); cr.position.x = 1.15; R2.add(cr);
    const pr = new THREE.Mesh(new THREE.BoxGeometry(2.15, .22, 2.85), pageM); pr.position.set(1.1, .14, 0); R2.add(pr);
    // text lines on pages
    const lineM = new THREE.MeshBasicMaterial({ color: 0x8b5cf6 });
    for (let s = -1; s <= 1; s += 2) for (let i = 0; i < 6; i++) {
      const ln = new THREE.Mesh(new THREE.PlaneGeometry(1.4 - (i % 3) * .25, .07), lineM); ln.rotation.x = -Math.PI / 2;
      ln.position.set(s * 1.1, .26, -1 + i * .38); (s < 0 ? L : R2).add(ln);
    }
    const flipPiv = new THREE.Group(); flipPiv.position.y = .27; book.add(flipPiv);
    const flip = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.8), new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x4b3a70, side: THREE.DoubleSide }));
    flip.rotation.x = -Math.PI / 2; flip.position.x = 1.05; flipPiv.add(flip);
    const bookGlow = glow(0xff6fb5, 6, .45); bookGlow.position.set(0, 2.4, -1.6); g.add(bookGlow);
    // cap
    const cap = new THREE.Group(); cap.position.set(0, 5.2, -1.8); g.add(cap);
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.2, .1, 2.2), new THREE.MeshPhongMaterial({ color: 0x1b1033, emissive: 0x2a1250 })); cap.add(board);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(.75, .85, .6, 24), new THREE.MeshPhongMaterial({ color: 0x1b1033, emissive: 0x2a1250 })); crown.position.y = -.35; cap.add(crown);
    const tassel = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .9, 6), new THREE.MeshBasicMaterial({ color: 0xf6c453 })); tassel.position.set(.95, -.4, .95); cap.add(tassel);
    const capEdge = new THREE.LineSegments(new THREE.EdgesGeometry(board.geometry), new THREE.LineBasicMaterial({ color: 0xff6fb5 })); cap.add(capEdge);
    const glyphs = ['AI', 'n8n', '</>', '⚡', 'Make', '✓', 'GPT', '★'].map((tx, i) => { const s = glyphSprite(tx, i % 2 ? '#ff6fb5' : '#a78bfa'); s.scale.setScalar(1.15); g.add(s); return s; });
    updaters.push((t) => {
      const ph = (t * .45) % 1; flipPiv.rotation.z = Math.PI * (ph < .7 ? THREE.MathUtils.smootherstep(ph / .7, 0, 1) : 1);
      flip.visible = ph < .97;
      cap.rotation.y = t * .6; cap.position.y = 5.2 + Math.sin(t * 1.2) * .25;
      glyphs.forEach((s, i) => { const p = (t * .18 + i / glyphs.length) % 1; const a = i * 2.1 + t * .3; s.position.set(Math.cos(a) * (1 + p * 1.6), 2 + p * 4.2, -1.4 + Math.sin(a) * (1 + p * 1.2)); s.material.opacity = Math.sin(p * Math.PI); });
    });
  }

  /* ring of light posts connecting zones */
  {
    const n = mobile ? 24 : 36;
    const geo = new THREE.CylinderGeometry(.06, .06, 1.2, 6); const mat = new THREE.MeshBasicMaterial({ color: 0x6d7cff });
    const posts = new THREE.InstancedMesh(geo, mat, n); const m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) { const a = i / n * TAU; m4.makeTranslation(Math.cos(a) * 10.5, .6, Math.sin(a) * 10.5); posts.setMatrixAt(i, m4); }
    scene.add(posts);
  }

  /* drifting particles */
  const dustN = mobile ? 260 : 600;
  const dust = (() => {
    const geo = new THREE.BufferGeometry(); const p = new Float32Array(dustN * 3);
    for (let i = 0; i < dustN; i++) { const r = 4 + Math.random() * 40, a = Math.random() * TAU; p[i * 3] = Math.cos(a) * r; p[i * 3 + 1] = Math.random() * 14; p[i * 3 + 2] = Math.sin(a) * r; }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: .16, map: glowTex, color: 0x9fd8ff, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(pts); return pts;
  })();

  /* rain (extra) */
  const rainN = mobile ? 900 : 1800;
  const rain = (() => {
    const geo = new THREE.BufferGeometry(); const p = new Float32Array(rainN * 6);
    for (let i = 0; i < rainN; i++) { const x = (Math.random() - .5) * 70, y = Math.random() * 30, z = (Math.random() - .5) * 70; p.set([x, y, z, x + .05, y - .7, z], i * 6); }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const l = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x9cc8ff, transparent: true, opacity: 0, depthWrite: false }));
    l.visible = false; scene.add(l); return l;
  })();

  /* ---------- environment state (day / night / rain) ---------- */
  const env = { night: 1, nightGoal: 1, rain: 0, rainGoal: 0 };
  const NIGHT = { top: new THREE.Color(0x070a22), bot: new THREE.Color(0x120a2e), glow: new THREE.Color(0x3b2a8a), fog: new THREE.Color(0x0a0c22), base: new THREE.Color(0x070b1d) };
  const DAY = { top: new THREE.Color(0x3d7bd9), bot: new THREE.Color(0xbfdcff), glow: new THREE.Color(0xffd7a8), fog: new THREE.Color(0x9fc3ea), base: new THREE.Color(0x4a5a7a) };
  const RAIN = { top: new THREE.Color(0x2a3140), bot: new THREE.Color(0x4a5466), fog: new THREE.Color(0x3a4352) };
  const tmpC = new THREE.Color();
  function applyEnv() {
    const n = env.night, r = env.rain;
    const S = sky.material.uniforms;
    S.top.value.copy(DAY.top).lerp(NIGHT.top, n).lerp(RAIN.top, r * (1 - n) * .8);
    S.bot.value.copy(DAY.bot).lerp(NIGHT.bot, n).lerp(RAIN.bot, r * (1 - n) * .8);
    S.glow.value.copy(DAY.glow).lerp(NIGHT.glow, n).multiplyScalar(1 - r * .6);
    S.night.value = n * (1 - r);
    tmpC.copy(DAY.fog).lerp(NIGHT.fog, n).lerp(RAIN.fog, r * (1 - n) * .8); fog.color.copy(tmpC); groundMat.uniforms.fogC.value.copy(tmpC); S.fogC.value.copy(tmpC);
    renderer.setClearColor(tmpC);
    groundMat.uniforms.base.value.copy(DAY.base).lerp(NIGHT.base, n);
    fog.density = .016 + r * .012 + (1 - n) * .002;
    hemi.intensity = lerp(1.6, .9, n); sun.intensity = lerp(1.4, .5, n) * (1 - r * .5);
    dust.material.opacity = .25 + n * .6;
    rain.visible = r > .01; rain.material.opacity = r * .55;
  }

  /* ---------- camera rig ---------- */
  const rig = { target: new THREE.Vector3(0, 2.5, 0), yaw: 0, pitch: mobile ? .62 : .56, dist: mobile ? 42 : 37 };
  const goal = { target: new THREE.Vector3(0, 2.5, 0), yaw: 0, pitch: rig.pitch, dist: rig.dist };
  let active = 'hub';
  function flyTo(key, fromUser = true) {
    const z = ZONES[key]; if (!z) return;
    if (key === 'hub') { goal.target.set(0, 2.5, 0); goal.dist = mobile ? 42 : 37; goal.pitch = mobile ? .62 : .56; goal.yaw = rig.yaw + angDiff(rig.yaw, rig.yaw + .0001); }
    else {
      const p = zonePos[key];
      goal.target.set(p.x * .96, mobile ? 3.6 : 3.4, p.z * .96);
      goal.yaw = rig.yaw + angDiff(rig.yaw, -z.angle);
      goal.dist = mobile ? 12.5 : 11; goal.pitch = mobile ? .2 : .16;
    }
    setActive(key);
    if (fromUser) stopTour();
  }

  /* ---------- UI ---------- */
  const capEl = root.querySelector('.aiw-caption');
  const capT = capEl && capEl.querySelector('.aiw-cap-title');
  const capP = capEl && capEl.querySelector('.aiw-cap-text');
  const chips = [...root.querySelectorAll('[data-zone]')];
  function setActive(key) {
    if (active === key && capEl && capEl.dataset.zone === key) return;
    active = key;
    if (capEl) {
      capEl.dataset.zone = key; capEl.classList.remove('aiw-cap-in'); void capEl.offsetWidth; capEl.classList.add('aiw-cap-in');
      capEl.style.setProperty('--aiw-c', '#' + new THREE.Color(ZONES[key].color).getHexString());
      capT.textContent = ZONES[key].name; capP.textContent = ZONES[key].text;
    }
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.zone === key)));
    const on = chips.find((c) => c.dataset.zone === key); const bar = on && on.parentElement;
    if (bar && bar.scrollWidth > bar.clientWidth) bar.scrollTo({ left: on.offsetLeft - (bar.clientWidth - on.offsetWidth) / 2, behavior: 'smooth' });
  }
  function say(title, text) { if (!capEl) return; capT.textContent = title; capP.textContent = text; capEl.classList.remove('aiw-cap-in'); void capEl.offsetWidth; capEl.classList.add('aiw-cap-in'); }
  chips.forEach((c) => c.addEventListener('click', () => flyTo(c.dataset.zone)));
  const fxBtns = [...root.querySelectorAll('[data-fx]')];
  function setFx(fx) {
    if (fx === 'night') env.nightGoal = 1; else if (fx === 'day') env.nightGoal = 0;
    else if (fx === 'rain') env.rainGoal = env.rainGoal > .5 ? 0 : 1;
    else if (fx === 'clear') env.rainGoal = 0;
    else if (fx === 'tour') startTour();
    fxBtns.forEach((b) => { const f = b.dataset.fx; b.setAttribute('aria-pressed', String(f === 'rain' ? env.rainGoal > .5 : f === 'night' ? env.nightGoal > .5 : f === 'day' ? env.nightGoal < .5 : f === 'tour' ? touring : false)); });
  }
  fxBtns.forEach((b) => b.addEventListener('click', () => setFx(b.dataset.fx)));
  const form = root.querySelector('.aiw-ask');
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault(); const inp = form.querySelector('input'); const q = ' ' + (inp.value || '').toLowerCase().trim() + ' ';
    if (!q.trim()) return;
    let did = false;
    for (const [fx, words] of FX_WORDS) if (words.some((w) => q.includes(w))) { setFx(fx); did = true; }
    for (const [z, words] of KEYWORDS) if (words.some((w) => q.includes(w))) { flyTo(z); did = true; break; }
    if (!did) say('Ye zone abhi nahi bana', 'Try karein: photo, editing, automation, course — ya raat, din, barish.');
    inp.blur();
  });

  /* ---------- auto tour ---------- */
  let touring = false, tourIdx = 0, tourT = 0, idleT = 0;
  function startTour() { touring = true; tourT = 0; tourIdx = (ORDER.indexOf(active) + 1) % ORDER.length; flyTo(ORDER[tourIdx], false); fxBtns.forEach((b) => b.dataset.fx === 'tour' && b.setAttribute('aria-pressed', 'true')); }
  function stopTour() { touring = false; idleT = 0; fxBtns.forEach((b) => b.dataset.fx === 'tour' && b.setAttribute('aria-pressed', 'false')); }

  /* ---------- input ---------- */
  const pointers = new Map(); let pinch0 = 0, dist0 = 0, moved = 0, downAt = 0;
  canvas.style.touchAction = standalone ? 'none' : 'pan-y';
  canvas.addEventListener('pointerdown', (e) => { pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; downAt = performance.now(); idleT = 0; if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = goal.dist; } try { canvas.setPointerCapture(e.pointerId); } catch (_) {} });
  canvas.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) goal.dist = clamp(dist0 * pinch0 / d, 6, 50); }
    else { goal.yaw -= dx * 0.006; goal.pitch = clamp(goal.pitch + dy * 0.004, .05, 1.2); if (touring && moved > 12) stopTour(); }
  });
  const up = (e) => {
    const wasTap = pointers.size === 1 && moved < 8 && performance.now() - downAt < 350;
    pointers.delete(e.pointerId); if (pointers.size < 2) pinch0 = 0;
    if (wasTap) pick(e);
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); pinch0 = 0; });
  canvas.addEventListener('wheel', (e) => { if (!standalone && !e.ctrlKey && !root.matches(':hover')) return; e.preventDefault(); goal.dist = clamp(goal.dist * (1 + Math.sign(e.deltaY) * .08), 6, 50); idleT = 0; }, { passive: false });
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  function pick(e) {
    const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera); const hit = ray.intersectObjects(pickables, false)[0];
    if (hit) flyTo(hit.object.userData.zone);
  }
  const keys = new Set();
  const keyTarget = standalone ? window : root;
  if (!standalone) root.tabIndex = root.tabIndex >= 0 ? root.tabIndex : 0;
  keyTarget.addEventListener('keydown', (e) => { if (e.target && /input|textarea/i.test(e.target.tagName)) return; const k = e.key.toLowerCase(); if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'q', 'e'].includes(k)) { keys.add(k); e.preventDefault(); if (touring) stopTour(); idleT = 0; } });
  keyTarget.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());

  /* ---------- sizing + visibility ---------- */
  let W = 0, H = 0;
  function resize() { const r = canvas.getBoundingClientRect(); W = Math.max(1, r.width | 0); H = Math.max(1, r.height | 0); renderer.setSize(W, H, false); camera.aspect = W / H; camera.fov = W / H < .8 ? 62 : 52; camera.updateProjectionMatrix(); }
  new ResizeObserver(resize).observe(canvas); resize();
  let onScreen = true;
  new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; if (onScreen) kick(); }, { threshold: .02 }).observe(root);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });

  /* ---------- loop ---------- */
  const clock = new THREE.Clock(); let t = 0, raf = 0, frames = 0, acc = 0, lowStreak = 0;
  const fwd = new THREE.Vector3(), right = new THREE.Vector3();
  function frame() {
    raf = 0;
    if (!onScreen || document.hidden) return;
    const dt = Math.min(clock.getDelta(), .05); t += dt;
    // keyboard walk
    if (keys.size) {
      fwd.set(-Math.sin(rig.yaw), 0, -Math.cos(rig.yaw)); right.set(-fwd.z, 0, fwd.x);
      const sp = 9 * dt;
      if (keys.has('w') || keys.has('arrowup')) goal.target.addScaledVector(fwd, -sp * -1);
      if (keys.has('s') || keys.has('arrowdown')) goal.target.addScaledVector(fwd, -sp);
      if (keys.has('a')) goal.target.addScaledVector(right, -sp);
      if (keys.has('d')) goal.target.addScaledVector(right, sp);
      if (keys.has('arrowleft') || keys.has('q')) goal.yaw += 1.6 * dt;
      if (keys.has('arrowright') || keys.has('e')) goal.yaw -= 1.6 * dt;
      goal.target.x = clamp(goal.target.x, -32, 32); goal.target.z = clamp(goal.target.z, -32, 32);
      // nearest zone becomes active
      let best = 'hub', bd = 7; for (const k of ORDER) { const d = Math.hypot(goal.target.x - zonePos[k].x, goal.target.z - zonePos[k].z); if (d < bd) { bd = d; best = k; } }
      if (best !== active) setActive(best);
    }
    // tour + idle
    idleT += dt;
    if (!touring && idleT > (standalone ? 14 : 10) && !pointers.size) startTour();
    if (touring) { tourT += dt; if (tourT > 7) { tourT = 0; tourIdx = (tourIdx + 1) % ORDER.length; flyTo(ORDER[tourIdx], false); } goal.yaw += dt * .05; }
    // ease rig
    const k = 1 - Math.pow(.0025, dt);
    rig.target.lerp(goal.target, k); rig.yaw += angDiff(rig.yaw, goal.yaw) * k; rig.pitch = lerp(rig.pitch, goal.pitch, k); rig.dist = lerp(rig.dist, goal.dist, k);
    const cp = Math.cos(rig.pitch);
    camera.position.set(rig.target.x + Math.sin(rig.yaw) * cp * rig.dist, rig.target.y + Math.sin(rig.pitch) * rig.dist, rig.target.z + Math.cos(rig.yaw) * cp * rig.dist);
    // keep the camera inside the sky and above ground
    camera.position.y = Math.max(camera.position.y, 1.2);
    camera.lookAt(rig.target);
    // env
    env.night = lerp(env.night, env.nightGoal, 1 - Math.pow(.2, dt)); env.rain = lerp(env.rain, env.rainGoal, 1 - Math.pow(.15, dt)); applyEnv();
    sky.material.uniforms.time.value = t; groundMat.uniforms.time.value = t;
    dust.rotation.y = t * .01; dust.position.y = Math.sin(t * .3) * .3;
    if (rain.visible) { rain.position.y = -((t * 22) % 30); rain.position.x = camera.position.x * 0; }
    for (const u of updaters) u(t, dt);
    renderer.render(scene, camera);
    // adaptive resolution
    frames++; acc += dt;
    if (acc > 2) { const fps = frames / acc; frames = 0; acc = 0;
      if (fps < 40 && dpr > .75) { lowStreak++; if (lowStreak >= 1) { dpr = Math.max(.75, dpr - .25); renderer.setPixelRatio(dpr); resize(); lowStreak = 0; } }
      else if (fps > 57 && dpr < maxDpr) { dpr = Math.min(maxDpr, dpr + .25); renderer.setPixelRatio(dpr); resize(); }
      root.dataset.fps = Math.round(fps); root.dataset.dpr = dpr;
    }
    kick();
  }
  function kick() { if (!raf) { clock.getDelta(); raf = requestAnimationFrame(frame); } }
  setActive('hub'); applyEnv();
  root.classList.add('aiw-ready'); root.classList.remove('aiw-loading-on');
  kick();
  const api = { flyTo, setFx, startTour, stopTour, get active() { return active; } };
  root.aiWorld = api; return api;
}
