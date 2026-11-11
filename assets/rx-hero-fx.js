/* Rehman AI: particle intro + hero water ripples + mascot float */
(function(){
  var reduced = false;
  try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e){}

  /* ---------- particle intro ---------- */
  var intro = document.getElementById('rxIntro');
  function skipIntro(){
    if (intro){ intro.classList.add('done'); setTimeout(function(){ if (intro.parentNode) intro.parentNode.removeChild(intro); }, 800); }
  }
  if (intro && !reduced){
    try {
      if (sessionStorage.getItem('rxIntroDone')) { skipIntro(); intro = null; }
    } catch(e){}
  } else if (intro) { skipIntro(); intro = null; }

  if (intro){
    try { sessionStorage.setItem('rxIntroDone','1'); } catch(e){}
    var cv = document.getElementById('rxIntroCanvas');
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio||1, 2);
    var W = 0, H = 0, offH = 0;
    var off = document.createElement('canvas');
    var octx = off.getContext('2d');
    var parts = [], cols = ['#22d3ee','#a78bfa','#f6c453','#e2e8f0'];
    var pctEl = document.getElementById('rxIntroPct');
    var DUR = 2400, T0 = 0;

    function buildTargets(){
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W*dpr; cv.height = H*dpr;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      var fs = Math.min(W*0.155, 168);
      off.width = W; off.height = Math.ceil(fs*1.25);
      offH = off.height;
      octx.clearRect(0,0,off.width,off.height);
      octx.fillStyle = '#fff';
      octx.font = '900 ' + fs + 'px Inter, Arial, system-ui, sans-serif';
      octx.textAlign = 'center'; octx.textBaseline = 'middle';
      octx.fillText('REHMAN AI', off.width/2, off.height/2);
      var data = octx.getImageData(0,0,off.width,off.height).data;
      var pts = [], step = Math.max(3, Math.round(W/260));
      for (var y=0; y<off.height; y+=step){
        for (var x=0; x<off.width; x+=step){
          if (data[(y*off.width + x)*4 + 3] > 128) pts.push({x:x, y:y});
        }
      }
      var oy = H*0.42 - offH/2;
      parts = pts.map(function(p, i){
        return {
          tx:p.x, ty:p.y+oy,
          sx:Math.random()*W, sy:Math.random()*H,
          d:Math.random()*0.35,
          c:cols[i % cols.length],
          r:Math.random()*1.3 + 0.8
        };
      });
    }

    function ease(t){ t=Math.max(0,Math.min(1,t)); return 1 - Math.pow(1-t,3); }

    function frame(now){
      if (!T0) T0 = now;
      var t = (now - T0) / DUR;
      ctx.clearRect(0,0,W,H);
      for (var i=0;i<parts.length;i++){
        var p = parts[i];
        var lt = ease((t - p.d) / (1 - p.d));
        var x = p.sx + (p.tx-p.sx)*lt, y = p.sy + (p.ty-p.sy)*lt;
        ctx.globalAlpha = 0.25 + 0.75*lt;
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(x, y, p.r, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (pctEl) pctEl.textContent = Math.round(ease(Math.min(1,t))*100);
      if (t < 1.12) requestAnimationFrame(frame);
      else skipIntro();
    }

    buildTargets();
    requestAnimationFrame(frame);
    var rt;
    window.addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(buildTargets, 150); });
  }

  /* ---------- mascot: placement + life (drifts, follows pointer, reacts) ---------- */
  var mEl = document.querySelector('.rx-mascot');
  var mCard = document.querySelector('.hero-visual .glass.preview');
  var mWrap = mEl ? mEl.parentElement : null;
  function placeMascot(){
    if (!mWrap || !mCard) return;
    mWrap.style.top = (mCard.offsetTop + 14) + 'px';
  }
  placeMascot();
  window.addEventListener('resize', placeMascot);
  window.addEventListener('load', placeMascot);
  if (document.fonts && document.fonts.ready) { try { document.fonts.ready.then(placeMascot); } catch(e){} }

  if (mWrap && !reduced){
    var mHero = document.querySelector('.hero');
    var tx=0, ty=0, tr=0, ts=1;      /* targets */
    var cx=0, cy=0, cr=0, cs=1;      /* current */
    var hopV=0, hopY=0;              /* jump physics */
    var wig=0, wigT=0;               /* wiggle impulse */
    var lastPtr=-1e9, nextWander=2600, wx=0, wy=0, wr=0;
    var mr=null, mrAt=0;
    function mrect(){
      if (!mWrap) return;
      mr = mWrap.getBoundingClientRect();
      mrAt = performance.now();
    }
    mrect();
    window.addEventListener('resize', mrect);

    function look(e){
      if (performance.now() - mrAt > 400) mrect();
      if (!mr) return;
      lastPtr = performance.now();
      var hx = mr.left + mr.width/2, hy = mr.top + mr.height*0.38;
      var dx = e.clientX - hx, dy = e.clientY - hy;
      var d = Math.hypot(dx, dy);
      var near = d < Math.max(mr.width*1.05, 110);
      var px = Math.max(-1, Math.min(1, dx/(mr.width*1.8)));
      var py = Math.max(-1, Math.min(1, dy/(mr.height*1.4)));
      var amp = near ? 14 : 22;
      tx = px*amp; ty = py*amp*0.7 + (near ? -5 : 0);
      tr = px*(near ? 6 : 4);
      ts = near ? 1.07 : 1;
      if (near && d < mr.width*0.5) ts = 1.12;
    }
    if (mHero){
      mHero.addEventListener('pointermove', look);
      mHero.addEventListener('pointerleave', function(){ tx=0; ty=0; tr=0; ts=1; });
      mHero.addEventListener('click', function(){
        if (hopY >= -0.5){ hopV = -8.2; wig = (Math.random()<0.5 ? -1 : 1)*10; }
      });
    }

    function mframe(now){
      /* idle wander when the pointer has been quiet for a while */
      if (now - lastPtr > 2600){
        if (now > nextWander){
          nextWander = now + 3800 + Math.random()*3200;
          wx = (Math.random()*2-1)*20; wy = (Math.random()*2-1)*10; wr = (Math.random()*2-1)*5;
          if (Math.random() < 0.4) hopV = -5.5;
        }
        tx += (wx - tx)*0.02; ty += (wy - ty)*0.02; tr += (wr - tr)*0.02; ts += (1 - ts)*0.05;
      }
      cx += (tx-cx)*0.075; cy += (ty-cy)*0.075; cr += (tr-cr)*0.075; cs += (ts-cs)*0.09;
      if (hopV || hopY < 0){
        hopY += hopV; hopV += 0.5;
        if (hopY > 0){ hopY = 0; hopV *= -0.35; if (Math.abs(hopV) < 1.2) hopV = 0; }
      }
      wigT += 0.25; wig *= 0.94;
      var wob = Math.sin(wigT*2.2)*wig;
      var bob = Math.sin(now*0.0011)*4;
      mWrap.style.transform = 'translate(-50%,-55%) translate3d(' + cx.toFixed(2) + 'px,' + (cy + bob + hopY).toFixed(2) + 'px,0) rotate(' + (cr + wob).toFixed(2) + 'deg) scale(' + cs.toFixed(3) + ')';
      requestAnimationFrame(mframe);
    }
    requestAnimationFrame(mframe);
  }

  /* ---------- hero water + ripples ---------- */
  var hero = document.querySelector('.hero');
  var wcv = document.getElementById('rxWater');
  if (hero && wcv && !reduced){
    var w = wcv.getContext('2d');
    var dpr2 = Math.min(window.devicePixelRatio||1, 2);
    var ww = 0, wh = 0;
    function wsize(){
      var r = wcv.getBoundingClientRect();
      ww = r.width || 1; wh = r.height || 1;
      wcv.width = ww*dpr2; wcv.height = wh*dpr2;
      w.setTransform(dpr2,0,0,dpr2,0,0);
    }
    wsize();
    window.addEventListener('resize', wsize);
    var rings = [], specks = [];
    for (var s=0; s<26; s++) specks.push({x:Math.random(), y:Math.random(), r:Math.random()*1.4+0.4, v:Math.random()*0.00022+0.00006, a:Math.random()*0.5+0.2, c:s%3});
    function ripple(x, y){
      rings.push({x:x, y:y, r:6, a:0.8, c:Math.random()<0.55?0:1});
      if (rings.length > 26) rings.shift();
    }
    hero.addEventListener('pointermove', function(e){
      var wr = wcv.getBoundingClientRect();
      var x = e.clientX - wr.left, y = Math.max(10, e.clientY - wr.top);
      if (x > 0 && x < wr.width && y < wr.height + 60) ripple(x, y);
    });
    var lastAmb = 0;
    function wframe(now){
      w.clearRect(0,0,ww,wh);
      var g = w.createRadialGradient(ww*0.5, wh*0.75, 10, ww*0.5, wh*0.75, Math.max(ww*0.42, 200));
      g.addColorStop(0,'rgba(167,139,250,0.20)');
      g.addColorStop(0.45,'rgba(34,211,238,0.10)');
      g.addColorStop(1,'rgba(10,14,26,0)');
      w.save();
      w.translate(ww*0.5, wh*0.75); w.scale(1, 0.4); w.translate(-ww*0.5, -wh*0.75);
      w.fillStyle = g;
      w.beginPath(); w.arc(ww*0.5, wh*0.75, Math.max(ww*0.42, 200), 0, 6.2832); w.fill();
      w.restore();
      if (now - lastAmb > 2000){ lastAmb = now; ripple(ww*(0.2+Math.random()*0.6), wh*(0.35+Math.random()*0.5)); }
      var sc = ['#22d3ee','#a78bfa','#f6c453'];
      for (var i=0;i<specks.length;i++){
        var sp = specks[i];
        sp.y -= sp.v;
        if (sp.y < 0){ sp.y = 1; sp.x = Math.random(); }
        w.globalAlpha = sp.a*0.5;
        w.fillStyle = sc[sp.c];
        w.beginPath(); w.arc(sp.x*ww, sp.y*wh, sp.r, 0, 6.2832); w.fill();
      }
      for (var j=rings.length-1; j>=0; j--){
        var rg = rings[j];
        rg.r += 2.6; rg.a -= 0.012;
        if (rg.a <= 0){ rings.splice(j,1); continue; }
        w.globalAlpha = rg.a;
        var grd = w.createLinearGradient(rg.x-rg.r, 0, rg.x+rg.r, 0);
        if (rg.c === 0){
          grd.addColorStop(0,'rgba(34,211,238,0)'); grd.addColorStop(0.5,'rgba(34,211,238,0.9)'); grd.addColorStop(1,'rgba(34,211,238,0)');
        } else {
          grd.addColorStop(0,'rgba(167,139,250,0)'); grd.addColorStop(0.5,'rgba(167,139,250,0.9)'); grd.addColorStop(1,'rgba(167,139,250,0)');
        }
        w.strokeStyle = grd; w.lineWidth = 1.6;
        w.save();
        w.translate(rg.x, rg.y); w.scale(1, 0.38);
        w.beginPath(); w.arc(0, 0, rg.r, 0, 6.2832); w.stroke();
        w.restore();
      }
      w.globalAlpha = 1;
      requestAnimationFrame(wframe);
    }
    requestAnimationFrame(wframe);
  }
})();
