(function () {
  "use strict";
  const W = 420,
    H = 700,
    LINE = 150,
    DROP_Y = 72;
  let R = [],
    N = 0,
    imgs = [];
  const G = 1500,
    E = 0.5,
    MU = 0.4,
    MUW = 0.5,
    EW = 0.45;
  const SUB = 4,
    ITER = 2,
    SPIN = 0.08;

  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");
  const elSc = document.getElementById("sc"),
    elBest = document.getElementById("best");
  const elOver = document.getElementById("over"),
    elFs = document.getElementById("fs");

  // Start downloading before the first gesture; decode when audio is unlocked.
  const collisionData = fetch("assets/audio/collision.wav")
    .then((response) => {
      if (!response.ok) throw new Error("Collision audio unavailable");
      return response.arrayBuffer();
    })
    .catch(() => null);
  let collisionBuffer = null;

  let AC = null,
    muted = false,
    lastHit = 0;
  function ac() {
    if (!AC) {
      try {
        AC = new (window.AudioContext || window.webkitAudioContext)();
        collisionData
          .then(async (data) => {
            if (data) collisionBuffer = await AC.decodeAudioData(data);
          })
          .catch(() => {});
      } catch (e) {}
    }
    if (AC && AC.state === "suspended") AC.resume();
    return AC;
  }
  function tone(f, d, type, vol, to, delay) {
    if (muted) return;
    const c = ac();
    if (!c) return;
    const t = c.currentTime + (delay || 0),
      o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + d + 0.02);
  }
  const sfxDrop = () => tone(520, 0.1, "sine", 0.22, 820);
  const sfxHit = (v) => {
    if (muted) return;
    const c = ac();
    if (!c) return;
    const n = performance.now();
    if (n - lastHit < 80) return;
    lastHit = n;
    if (!collisionBuffer) {
      // Preserve feedback if the sample has not loaded or cannot be decoded.
      const f = 620 + Math.random() * 320;
      tone(f, 0.09, "sine", Math.min(0.16, v / 3000), f * 1.5);
      return;
    }
    const source = c.createBufferSource();
    const gain = c.createGain();
    source.buffer = collisionBuffer;
    gain.gain.value = Math.min(0.65, v / 1200);
    source.connect(gain);
    gain.connect(c.destination);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    source.start();
  };
  function sfxMerge(lv) {
    const f = 523 * Math.pow(2, lv / 8);
    tone(f, 0.14, "sine", 0.26, f * 1.25);
    tone(f * 1.5, 0.18, "sine", 0.2, f * 1.9, 0.07);
    tone(f * 2, 0.2, "triangle", 0.1, null, 0.14);
  }
  const sfxOver = () => {
    tone(520, 0.25, "sine", 0.22, 330);
    tone(392, 0.25, "sine", 0.2, 247, 0.2);
    tone(294, 0.5, "sine", 0.2, 175, 0.4);
  };

  let balls,
    effects,
    score,
    best = 0,
    heldLv,
    nextLv,
    cool,
    over,
    aimX,
    acc = 0,
    last = 0;
  try {
    best = +localStorage.getItem("xigua_best") || 0;
  } catch (e) {}
  elBest.textContent = best;

  const rnd = () => Math.floor(Math.random() * Math.min(5, N));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function mk(lv, x, y) {
    const r = R[lv];
    return {
      lv,
      r,
      m: r * r,
      x,
      y,
      vx: 0,
      vy: 0,
      a: Math.random() * 6.283,
      w: 0,
      age: 0,
      over: 0,
      dead: false,
      pop: 1,
    };
  }

  function reset() {
    merges = [];
    update.danger = false;
    balls = [];
    effects = [];
    score = 0;
    over = false;
    cool = 0;
    heldLv = rnd();
    nextLv = rnd();
    aimX = W / 2;
    elSc.textContent = 0;
    elOver.classList.remove("show");
  }

  let merges = [];
  function pair(a, b) {
    const dx = b.x - a.x,
      dy = b.y - a.y,
      rr = a.r + b.r,
      d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr) return;
    if (a.lv === b.lv) {
      a.dead = b.dead = true;
      merges.push([a, b]);
      return;
    }
    const d = Math.sqrt(d2) || 0.0001,
      nx = dx / d,
      ny = dy / d,
      ov = rr - d;
    const ia = 1 / a.m,
      ib = 1 / b.m,
      s = (ov * 0.85) / (ia + ib);
    a.x -= nx * s * ia;
    a.y -= ny * s * ia;
    b.x += nx * s * ib;
    b.y += ny * s * ib;
    const rax = nx * a.r,
      ray = ny * a.r,
      rbx = -nx * b.r,
      rby = -ny * b.r;
    let rvx = b.vx - b.w * rby - (a.vx - a.w * ray),
      rvy = b.vy + b.w * rbx - (a.vy + a.w * rax);
    const vn = rvx * nx + rvy * ny;
    if (vn >= 0) return;
    if (-vn > 200) sfxHit(-vn);
    const e = -vn > 25 ? E : 0;
    const j = (-(1 + e) * vn) / (ia + ib);
    a.vx -= j * nx * ia;
    a.vy -= j * ny * ia;
    b.vx += j * nx * ib;
    b.vy += j * ny * ib;
    rvx = b.vx - b.w * rby - (a.vx - a.w * ray);
    rvy = b.vy + b.w * rbx - (a.vy + a.w * rax);
    const tx = -ny,
      ty = nx,
      vt = rvx * tx + rvy * ty;
    let jt = -vt / (3 * (ia + ib));
    const mx = MU * j;
    jt = clamp(jt, -mx, mx);
    a.vx -= jt * tx * ia;
    a.vy -= jt * ty * ia;
    b.vx += jt * tx * ib;
    b.vy += jt * ty * ib;
    a.w += (SPIN * -jt * a.r) / (0.5 * a.m * a.r * a.r);
    b.w += (SPIN * -jt * b.r) / (0.5 * b.m * b.r * b.r);
  }

  function wall(b, nx, ny, pen) {
    b.x -= nx * pen;
    b.y -= ny * pen;
    const rx = nx * b.r,
      ry = ny * b.r;
    const vcx = b.vx - b.w * ry,
      vcy = b.vy + b.w * rx;
    const vn = vcx * nx + vcy * ny;
    if (vn <= 0) return;
    if (vn > 200) sfxHit(vn);
    const e = vn > 25 ? EW : 0;
    const J = (1 + e) * vn * b.m;
    b.vx -= (J * nx) / b.m;
    b.vy -= (J * ny) / b.m;
    const tx = -ny,
      ty = nx,
      vt = vcx * tx + vcy * ty;
    let jt = (-vt * b.m) / 3;
    const mx = MUW * J;
    jt = clamp(jt, -mx, mx);
    b.vx += (jt * tx) / b.m;
    b.vy += (jt * ty) / b.m;
    b.w += (SPIN * -jt * b.r) / (0.5 * b.m * b.r * b.r);
  }

  function substep(dt) {
    for (const b of balls) {
      b.vy += G * dt;
      const k = 1 - 0.5 * dt;
      b.vx *= k;
      b.vy *= k;
      b.w *= Math.max(0, 1 - 16 * dt);
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > 1100) {
        b.vx *= 1100 / sp;
        b.vy *= 1100 / sp;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.a += b.w * dt;
    }
    for (let it = 0; it < ITER; it++) {
      for (const b of balls) {
        if (b.dead) continue;
        let p;
        if ((p = b.r - b.x) > 0) wall(b, -1, 0, p);
        if ((p = b.x + b.r - W) > 0) wall(b, 1, 0, p);
        if ((p = b.y + b.r - H) > 0) wall(b, 0, 1, p);
      }
      for (let i = 0; i < balls.length; i++) {
        const a = balls[i];
        if (a.dead) continue;
        for (let j = i + 1; j < balls.length; j++) {
          const b = balls[j];
          if (b.dead) continue;
          pair(a, b);
        }
      }
    }
    if (merges.length) doMerges();
  }

  function doMerges() {
    const add = [];
    for (const [a, b] of merges) {
      const x = (a.x + b.x) / 2,
        y = (a.y + b.y) / 2;
      effects.push({ x, y, r: a.r, t: 0 });
      sfxMerge(a.lv);
      if (a.lv === N - 1) {
        score += 200;
        continue;
      }
      const nb = mk(a.lv + 1, x, y);
      nb.vx = (a.vx + b.vx) / 2;
      nb.vy = (a.vy + b.vy) / 2;
      nb.w = (a.w + b.w) / 2;
      nb.a = a.a;
      nb.age = Math.max(a.age, b.age);
      nb.pop = 0.55;
      add.push(nb);
      score += ((nb.lv + 1) * (nb.lv + 2)) / 2;
    }
    merges = [];
    balls = balls.filter((b) => !b.dead).concat(add);
    elSc.textContent = score;
  }

  function drop() {
    if (paused || over || cool > 0 || heldLv < 0) return;
    const r = R[heldLv];
    const b = mk(heldLv, clamp(aimX, r + 2, W - r - 2), DROP_Y);
    b.vy = 60;
    balls.push(b);
    heldLv = -1;
    cool = 0.55;
    sfxDrop();
  }

  function endGame() {
    over = true;
    sfxOver();
    try {
      goatcounter.count({ path: "game-over", title: "游戏结束", event: true });
    } catch (e) {}
    if (score > best) {
      best = score;
      try {
        localStorage.setItem("xigua_best", best);
      } catch (e) {}
      elBest.textContent = best;
    }
    elFs.textContent = score;
    elOver.classList.add("show");
  }

  function update(dt) {
    if (over) return;
    if (cool > 0) {
      cool -= dt;
      if (cool <= 0) {
        heldLv = nextLv;
        nextLv = rnd();
      }
    }
    for (let i = 0; i < SUB; i++) substep(dt / SUB);
    let danger = false;
    for (const b of balls) {
      b.age += dt;
      b.pop += (1 - b.pop) * Math.min(1, dt * 14);
      if (b.age > 0.9 && b.y - b.r < LINE) {
        b.over += dt;
        danger = true;
      } else b.over = 0;
      if (b.over > 2) {
        endGame();
        break;
      }
    }
    update.danger = danger;
    for (const f of effects) f.t += dt;
    effects = effects.filter((f) => f.t < 0.35);
  }

  function drawBall(lv, x, y, a, scale) {
    const r = R[lv] * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.drawImage(imgs[lv], -r, -r, 2 * r, 2 * r);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x, y, r - 0.5, 0, 6.2832);
    ctx.strokeStyle = "rgba(255,255,255,.85)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function draw(now) {
    const sx = canvas.width / W,
      sy = canvas.height / H;
    ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if (!draw.bg) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#a92a21");
      g.addColorStop(1, "#8f1d17");
      draw.bg = g;
    }
    ctx.fillStyle = draw.bg;
    ctx.fillRect(0, 0, W, H);

    const blink = update.danger && Math.floor(now / 180) % 2 === 0;
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = blink ? "#f2cf4a" : "rgba(242,207,74,.6)";
    ctx.beginPath();
    ctx.moveTo(0, LINE);
    ctx.lineTo(W, LINE);
    ctx.stroke();
    ctx.setLineDash([]);

    if (!over && heldLv >= 0) {
      const r = R[heldLv],
        x = clamp(aimX, r + 2, W - r - 2);
      ctx.setLineDash([4, 8]);
      ctx.strokeStyle = "rgba(242,207,74,.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, DROP_Y + r);
      ctx.lineTo(x, H);
      ctx.stroke();
      ctx.setLineDash([]);
      drawBall(heldLv, x, DROP_Y, 0, 1);
    }

    for (const b of balls) drawBall(b.lv, b.x, b.y, b.a, b.pop);

    for (const f of effects) {
      const p = f.t / 0.35;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (1 + p * 0.7), 0, 6.2832);
      ctx.strokeStyle = "rgba(242,207,74," + 0.7 * (1 - p) + ")";
      ctx.lineWidth = 4 * (1 - p) + 1;
      ctx.stroke();
    }
  }

  function fit() {
    const used =
      document.getElementById("top").offsetHeight +
      16 +
      parseFloat(getComputedStyle(document.getElementById("app")).paddingTop) +
      parseFloat(
        getComputedStyle(document.getElementById("app")).paddingBottom,
      );
    const s = Math.min((innerWidth - 16) / W, (innerHeight - used) / H);
    const cw = Math.max(200, W * s),
      ch = Math.max(300, H * s);
    canvas.style.width = cw + "px";
    canvas.style.height = ch + "px";
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
  }

  let paused = true;
  let started = false;
  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    if (!paused) update(dt);
    if (!paused) draw(t);
    requestAnimationFrame(loop);
  }

  const px = (e) => {
    const r = canvas.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * W;
  };
  canvas.addEventListener("pointerdown", (e) => {
    ac();
    aimX = px(e);
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_) {}
  });
  canvas.addEventListener("pointermove", (e) => {
    aimX = px(e);
  });
  canvas.addEventListener("pointerup", (e) => {
    aimX = px(e);
    drop();
  });
  window.addEventListener("keydown", (e) => {
    if (paused || e.target.closest("button, input, select, textarea")) return;
    if (e.key === "ArrowLeft") aimX -= 14;
    else if (e.key === "ArrowRight") aimX += 14;
    else if (e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      drop();
    }
  });
  document.getElementById("re").addEventListener("click", reset);
  const snd = document.getElementById("snd");
  snd.addEventListener("click", () => {
    muted = !muted;
    snd.textContent = muted ? "🔇" : "🔊";
    if (!muted) {
      ac();
      sfxDrop();
    }
  });
  document.getElementById("again").addEventListener("click", reset);
  window.addEventListener("resize", fit);

  window.mergeGame = {
    pause() {
      paused = true;
    },
    start(images) {
      imgs = images;
      N = imgs.length;
      R =
        N === 11
          ? [17, 24, 32, 40, 50, 60, 72, 85, 99, 114, 130]
          : Array.from(
              { length: N },
              (_, i) => 17 + 113 * Math.pow(i / (N - 1), 1.3),
            );
      reset();
      fit();
      paused = false;
      last = performance.now();
      if (!started) {
        started = true;
        requestAnimationFrame(loop);
      }
    },
  };
})();
