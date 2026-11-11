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

  /* ---------- mascot placement (peeks over the card top) ---------- */
  var mEl = document.querySelector('.rx-mascot');
  var mCard = document.querySelector('.hero-visual .glass.preview');
  function placeMascot(){
    if (!mEl || !mCard) return;
    mEl.style.top = (mCard.offsetTop + 14) + 'px';
  }
  placeMascot();
  window.addEventListener('resize', placeMascot);
  window.addEventListener('load', placeMascot);
  if (document.fonts && document.fonts.ready) { try { document.fonts.ready.then(placeMascot); } catch(e){} }

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
