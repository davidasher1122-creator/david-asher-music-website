/* David Asher Music — custom assets + dual-layer dissolve */
(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  /* ——— Boot ——— */
  const loader = document.querySelector(".boot-loader");
  if (loader) {
    const dismiss = () => {
      loader.classList.add("is-done");
      document.body.classList.add("is-booted");
      setTimeout(() => loader.remove(), 600);
    };
    setTimeout(dismiss, reduceMotion ? 0 : 900);
  } else {
    document.body.classList.add("is-booted");
  }

  /* ——— Header / progress / nav ——— */
  const header = document.querySelector(".site-header");
  const progress = document.querySelector(".scroll-progress");
  const sections = ["about", "portfolio", "signup"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const navLinks = document.querySelectorAll('.nav__links a[href^="#"]');

  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 10);
    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    }
    const y = window.scrollY + 130;
    let current = "";
    sections.forEach((s) => {
      if (s.offsetTop <= y) current = s.id;
    });
    navLinks.forEach((a) => {
      a.classList.toggle("is-active", a.getAttribute("href") === `#${current}`);
    });
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  const toggle = document.querySelector(".nav-toggle");
  const drawer = document.querySelector(".nav-drawer");
  if (toggle && drawer) {
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      drawer.classList.toggle("is-open", open);
      document.body.style.overflow = open ? "hidden" : "";
    };
    toggle.addEventListener("click", () =>
      setOpen(toggle.getAttribute("aria-expanded") !== "true")
    );
    drawer.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });
  }

  /* ——— Reveals ——— */
  const reveals = document.querySelectorAll("[data-reveal]");
  if (reveals.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      reveals.forEach((el) => el.classList.add("is-in"));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("is-in");
              io.unobserve(e.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: "0px 0px -5% 0px" }
      );
      reveals.forEach((el) => io.observe(el));
    }
  }

  /* ——— Magnetic + tilt ——— */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll("[data-magnetic]").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        btn.style.transform = `translate(${dx * 0.35}px, ${dy * 0.4}px) scale(1.06)`;
      });
      btn.addEventListener("pointerleave", () => {
        btn.style.transform = "";
      });
    });

    document.querySelectorAll("[data-tilt]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(700px) rotateY(${px * 14}deg) rotateX(${-py * 12}deg) translateY(-10px) scale(1.03)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "";
      });
    });
  }

  /* ——— Bio toggle ——— */
  const bio = document.querySelector(".bio-collapse");
  const bioBtn = document.querySelector("[data-bio-toggle]");
  if (bio && bioBtn) {
    bioBtn.addEventListener("click", () => {
      const open = bio.getAttribute("data-collapsed") === "true";
      bio.setAttribute("data-collapsed", open ? "false" : "true");
      bioBtn.setAttribute("aria-expanded", open ? "true" : "false");
      bioBtn.textContent = open ? "Show less" : "Read full bio";
    });
  }

  /* =========================================================
     Particle field factory
     ========================================================= */
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Record<string, any>} opts
   */
  function createParticleField(canvas, opts) {
    if (reduceMotion) {
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.src = opts.images[0];
      img.onload = () => {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * (opts.cover || 1);
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        ctx.globalAlpha = opts.opacity ?? 1;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      };
      return { blast() {}, setImageIndex() {}, rebuild() {} };
    }

    const ctx = canvas.getContext("2d", { alpha: true });
    const cellSize = opts.cellSize ?? 9;
    const cover = opts.cover ?? 0.88;
    const baseOpacity = opts.opacity ?? 1;
    const forceMul = opts.force ?? 1.8;
    const radiusBase = opts.radius ?? 120;
    const spring = opts.spring ?? 0.045;
    const drag = opts.drag ?? 0.86;
    const interactive = opts.interactive !== false;
    const globalPointer = opts.globalPointer === true;
    const depth = opts.depth ?? 1;
    const drawBaseImage = opts.drawBaseImage === true;
    const baseImageOpacity = opts.baseImageOpacity ?? 0.5;

    /** @type {Array<any>} */
    let particles = [];
    let w = 0;
    let h = 0;
    let dpr = 1;
    let mx = -9999;
    let my = -9999;
    let ready = false;
    let pointerDown = false;
    let imgIndex = 0;
    let imgRect = { ix: 0, iy: 0, dw: 0, dh: 0 };

    const loaded = opts.images.map((src) => {
      const im = new Image();
      im.src = src;
      return im;
    });

    function allLoaded() {
      return loaded.every((im) => im.complete && im.naturalWidth > 0);
    }

    function waitImages() {
      return Promise.all(
        loaded.map(
          (im) =>
            new Promise((res) => {
              if (im.complete && im.naturalWidth) res();
              else {
                im.onload = () => res();
                im.onerror = () => res();
              }
            })
        )
      );
    }

    function currentImg() {
      return loaded[imgIndex % loaded.length];
    }

    function layoutImage(img) {
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * cover;
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      const ix = (w - dw) / 2;
      const iy = (h - dh) / 2;
      imgRect = { ix, iy, dw, dh };
      return imgRect;
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      if (w < 2 || h < 2) return;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (allLoaded()) buildParticles();
    }

    function buildParticles() {
      particles = [];
      const img = currentImg();
      if (!img || !img.naturalWidth) return;

      const { ix, iy, dw, dh } = layoutImage(img);
      const cols = Math.max(8, Math.floor(dw / cellSize));
      const rows = Math.max(8, Math.floor(dh / cellSize));
      const cellW = dw / cols;
      const cellH = dh / rows;

      const off = document.createElement("canvas");
      off.width = cols;
      off.height = rows;
      const octx = off.getContext("2d");
      octx.drawImage(img, 0, 0, cols, rows);

      let data = null;
      try {
        data = octx.getImageData(0, 0, cols, rows).data;
      } catch {
        data = null;
      }

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          let r = 80;
          let g = 80;
          let b = 80;
          let a = 255;
          if (data) {
            const i = (row * cols + col) * 4;
            r = data[i];
            g = data[i + 1];
            b = data[i + 2];
            a = data[i + 3];
            if (a < 28) continue;
          }
          if (r + g + b < 12) continue;

          const ox = ix + col * cellW + cellW / 2;
          const oy = iy + row * cellH + cellH / 2;
          particles.push({
            ox,
            oy,
            x: ox + (Math.random() - 0.5) * 3,
            y: oy + (Math.random() - 0.5) * 3,
            vx: 0,
            vy: 0,
            w: cellW * 0.95,
            h: cellH * 0.95,
            color: `rgba(${r},${g},${b},${(a / 255) * baseOpacity})`,
          });
        }
      }
      ready = particles.length > 0;
    }

    function setImageIndex(idx) {
      const next = ((idx % loaded.length) + loaded.length) % loaded.length;
      if (next === imgIndex) return;
      imgIndex = next;
      buildParticles();
    }

    function setPointer(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      mx = clientX - rect.left;
      my = clientY - rect.top;
    }

    function onPointerMove(e) {
      const x = e.clientX ?? e.touches?.[0]?.clientX;
      const y = e.clientY ?? e.touches?.[0]?.clientY;
      if (x == null) return;
      if (globalPointer) {
        setPointer(x, y);
      } else {
        const rect = canvas.getBoundingClientRect();
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
          mx = -9999;
          my = -9999;
          return;
        }
        setPointer(x, y);
      }
    }

    if (interactive) {
      if (globalPointer) {
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener(
          "pointerdown",
          (e) => {
            pointerDown = true;
            onPointerMove(e);
            blast(mx, my, 1.4);
          },
          { passive: true }
        );
        window.addEventListener("pointerup", () => {
          pointerDown = false;
        });
      } else {
        canvas.addEventListener("pointermove", onPointerMove, { passive: true });
        canvas.addEventListener(
          "pointerdown",
          (e) => {
            pointerDown = true;
            onPointerMove(e);
            blast(mx, my, 2);
          },
          { passive: true }
        );
        canvas.addEventListener("pointerup", () => {
          pointerDown = false;
        });
        canvas.addEventListener("pointerleave", () => {
          mx = -9999;
          my = -9999;
          pointerDown = false;
        });
      }
    }

    function blast(cx, cy, power) {
      if (cx < -100) return;
      const R = radiusBase * 1.4 * power;
      particles.forEach((p) => {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < R) {
          const f = ((R - dist) / R) * 22 * power * forceMul * depth;
          p.vx += (dx / dist) * f + (Math.random() - 0.5) * 6;
          p.vy += (dy / dist) * f + (Math.random() - 0.5) * 6;
        }
      });
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);

      // Optional full image under particles (extra punch when CSS photos alone aren't enough)
      if (drawBaseImage) {
        const img = currentImg();
        if (img && img.naturalWidth) {
          const { ix, iy, dw, dh } = layoutImage(img);
          ctx.save();
          ctx.globalAlpha = baseImageOpacity;
          ctx.drawImage(img, ix, iy, dw, dh);
          ctx.restore();
        }
      }

      if (!ready) {
        requestAnimationFrame(frame);
        return;
      }

      // Mouse-over dissolve: push particles hard away from cursor
      const radius = pointerDown ? radiusBase * 1.55 : radiusBase;
      const force = (pointerDown ? 3.4 : 2.2) * forceMul * depth;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        let near = false;
        if (mx > -500) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const dist = Math.hypot(dx, dy);
          if (dist < radius) {
            near = true;
            const falloff = (radius - dist) / radius;
            const f = falloff * force;
            // Explode outward — this is the dissolve
            p.vx += (dx / (dist || 1)) * f * 5.5 + (Math.random() - 0.5) * 2.2;
            p.vy += (dy / (dist || 1)) * f * 5.5 + (Math.random() - 0.5) * 2.2;
          }
        }

        // Return home slower while dissolving so the break is obvious
        const home = near ? spring * 0.35 : spring;
        p.vx += (p.ox - p.x) * home;
        p.vy += (p.oy - p.y) * home;
        p.vx *= near ? Math.min(0.94, drag + 0.04) : drag;
        p.vy *= near ? Math.min(0.94, drag + 0.04) : drag;
        p.x += p.vx;
        p.y += p.vy;

        // Fine dots of light (not chunky squares)
        const scatter = Math.min(1.5, Math.hypot(p.vx, p.vy) / 7);
        const r = Math.max(1.1, Math.min(p.w, p.h) * 0.38 * (1 + scatter * 0.35));
        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = baseOpacity * (0.82 + Math.min(0.18, scatter * 0.12));
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (interactive && !globalPointer && mx > -500) {
        ctx.beginPath();
        ctx.arc(mx, my, pointerDown ? 30 : 20, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(mx, my, pointerDown ? 52 : 38, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(218,9,241,0.45)";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      requestAnimationFrame(frame);
    }

    waitImages().then(() => {
      resize();
      requestAnimationFrame(frame);
    });
    window.addEventListener("resize", resize);

    if (opts.images.length > 1) {
      let lastIdx = 0;
      window.addEventListener(
        "scroll",
        () => {
          const max = document.documentElement.scrollHeight - window.innerHeight;
          const t = max > 0 ? window.scrollY / max : 0;
          const idx = Math.min(opts.images.length - 1, Math.floor(t * opts.images.length));
          if (idx !== lastIdx) {
            lastIdx = idx;
            setImageIndex(idx);
          }
        },
        { passive: true }
      );
    }

    return { blast, rebuild: buildParticles, setImageIndex };
  }

  /*
   * DISSOLVE = mouse-over particle shatter.
   * Images are built FROM particles. Move the mouse → they fly apart.
   * Backgrounds A–E: full-screen, react to mouse anywhere.
   * Hero main image: large stage, dissolve when mouse is over it.
   */
  const bgSrcs = [
    "assets/custom/background-A.jpg",
    "assets/custom/background-B.jpg",
    "assets/custom/background-C.jpg",
    "assets/custom/background-D.jpg",
    "assets/custom/background-E.jpg",
  ];

  const bgCanvas = document.querySelector("#bg-canvas");
  let bgField = null;
  if (bgCanvas instanceof HTMLCanvasElement) {
    bgField = createParticleField(bgCanvas, {
      images: bgSrcs,
      cellSize: 5,
      cover: 1.12,
      opacity: 0.9,
      force: 2.6,
      radius: 165,
      spring: 0.03,
      drag: 0.88,
      interactive: true,
      globalPointer: true,
      depth: 1.1,
      drawBaseImage: false,
    });
  }

  // Switch which background (A–E) is active as you scroll — still mouse-dissolves
  if (bgField) {
    let lastBg = 0;
    const syncBg = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const t = max > 0 ? window.scrollY / max : 0;
      const idx = Math.min(bgSrcs.length - 1, Math.floor(t * bgSrcs.length));
      if (idx !== lastBg) {
        lastBg = idx;
        bgField.setImageIndex(idx);
      }
    };
    window.addEventListener("scroll", syncBg, { passive: true });
  }

  /* ——— Hero: main interactive image — fine mouse dissolve ——— */
  const heroCanvas = document.querySelector("#hero-canvas");
  if (heroCanvas instanceof HTMLCanvasElement) {
    createParticleField(heroCanvas, {
      images: ["assets/custom/main-interactive.png"],
      cellSize: 4,
      cover: 0.98,
      opacity: 1,
      force: 3.0,
      radius: 155,
      spring: 0.032,
      drag: 0.83,
      interactive: true,
      globalPointer: false,
      depth: 1.3,
      drawBaseImage: false,
    });
  }

  /* ——— Burst FX ——— */
  const fx = document.createElement("div");
  fx.className = "fx-layer";
  fx.setAttribute("aria-hidden", "true");
  document.body.appendChild(fx);

  function spawnBurst(x, y, count) {
    if (reduceMotion) return;
    const colors = ["#116dff", "#7816f7", "#da09f1", "#df3131", "#36c182", "#2f5dff"];
    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 120;
      const size = 4 + Math.random() * 10;
      el.style.cssText = `
        position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;
        border-radius:${Math.random() > 0.5 ? "50%" : "2px"};
        background:${colors[i % colors.length]};
        pointer-events:none;
        box-shadow:0 0 10px ${colors[i % colors.length]};
        transition:transform 0.7s cubic-bezier(.15,.85,.25,1), opacity 0.7s;
        opacity:1;
      `;
      fx.appendChild(el);
      requestAnimationFrame(() => {
        el.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) rotate(${Math.random() * 400}deg) scale(0)`;
        el.style.opacity = "0";
      });
      setTimeout(() => el.remove(), 750);
    }
  }

  document.querySelectorAll(".track").forEach((track) => {
    track.addEventListener("pointerenter", (e) => spawnBurst(e.clientX, e.clientY, 18));
  });
  document.querySelectorAll(".btn").forEach((btn) => {
    btn.addEventListener("pointerenter", (e) => spawnBurst(e.clientX, e.clientY, 10));
  });

  /* ——— Track previews ——— */
  document.querySelectorAll("[data-track-play]").forEach((btn) => {
    const card = btn.closest(".track");
    let playing = false;
    let raf = 0;
    let start = 0;

    btn.addEventListener("click", (e) => {
      playing = !playing;
      btn.setAttribute("aria-pressed", playing ? "true" : "false");
      btn.textContent = playing ? "Stop" : "Preview";
      card?.classList.toggle("is-playing", playing);
      spawnBurst(e.clientX, e.clientY, 24);
      if (!playing) {
        cancelAnimationFrame(raf);
        if (card) card.style.setProperty("--playhead", "0%");
        return;
      }
      start = performance.now();
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          const ac = new AC();
          const o = ac.createOscillator();
          const g = ac.createGain();
          o.type = "sine";
          o.frequency.value = 180 + Math.random() * 120;
          g.gain.value = 0.0001;
          o.connect(g);
          g.connect(ac.destination);
          o.start();
          g.gain.exponentialRampToValueAtTime(0.08, ac.currentTime + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.4);
          o.stop(ac.currentTime + 0.45);
        }
      } catch (_) {}
      function tick(now) {
        const p = Math.min(1, (now - start) / 4000);
        if (card) card.style.setProperty("--playhead", `${p * 100}%`);
        if (p < 1 && playing) raf = requestAnimationFrame(tick);
        else {
          playing = false;
          btn.setAttribute("aria-pressed", "false");
          btn.textContent = "Preview";
          card?.classList.remove("is-playing");
          if (card) card.style.setProperty("--playhead", "0%");
        }
      }
      raf = requestAnimationFrame(tick);
    });
  });

  /* ——— Form ——— */
  const form = document.querySelector("#inquiry-form");
  if (form) {
    const statusEl = form.querySelector(".form-status");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const first = String(data.get("first") || "").trim();
      const last = String(data.get("last") || "").trim();
      const name = [first, last].filter(Boolean).join(" ");
      const email = String(data.get("email") || "").trim();
      const iam = String(data.get("iam") || "").trim();
      const message = String(data.get("message") || "").trim();
      const newsletter = data.get("newsletter")
        ? String(data.get("newsletter"))
        : "No newsletter";

      if (!first || !last || !email || !message) {
        if (statusEl) {
          statusEl.textContent = "Please fill in name, email, and message.";
          statusEl.className = "form-status is-error";
        }
        return;
      }

      const subject = encodeURIComponent(`David Asher Music — ${name}`);
      const body = encodeURIComponent(
        [
          `Name: ${name}`,
          `Email: ${email}`,
          iam ? `I am a: ${iam}` : null,
          `Newsletter: ${newsletter}`,
          "",
          message,
        ]
          .filter(Boolean)
          .join("\n")
      );
      const to = form.dataset.email || "hello@davidasher.music";
      if (statusEl) {
        statusEl.textContent = "Opening your email app…";
        statusEl.className = "form-status is-success";
      }
      window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    });
  }
})();
