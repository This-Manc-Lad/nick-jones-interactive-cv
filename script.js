(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  /* ---------- Year ---------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Intro letter loader ---------- */
  const body = document.body;
  const letterLoader = $("#letter-loader");
  const letterOpen = $("#letter-open");
  const letterSkip = $("#letter-skip");
  let introStarted = false;

  function finishIntro() {
    if (!body) return;
    body.classList.remove("preload-active");
    if (letterLoader) letterLoader.setAttribute("hidden", "");
    window.setTimeout(() => {
      const hash = window.location.hash;
      if (hash) {
        const target = document.querySelector(hash);
        if (target) {
          const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - 24);
          window.scrollTo({ top, left: 0, behavior: "auto" });
        }
      }
      $$("[data-reveal]").forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.94 && rect.bottom > 0) {
          el.classList.add("is-visible");
        }
      });
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("resize"));
    }, 40);
  }

  function openIntro(immediate) {
    if (introStarted) return;
    introStarted = true;
    if (!letterLoader || reduceMotion || immediate) {
      finishIntro();
      return;
    }
    letterLoader.classList.add("is-opening");
    window.setTimeout(finishIntro, 1250);
  }

  if (letterLoader) {
    if (reduceMotion) {
      window.setTimeout(() => openIntro(true), 260);
    } else {
      window.setTimeout(() => openIntro(false), 1150);
    }
    if (letterOpen) letterOpen.addEventListener("click", () => openIntro(false));
    if (letterSkip) letterSkip.addEventListener("click", () => openIntro(true));
  }

  /* ---------- Nav: scrolled state + mobile menu ---------- */
  const nav = $(".site-nav");
  const toggle = $(".nav-toggle");
  const menu = $("#mobile-menu");

  function setNavState() {
    if (nav) nav.classList.toggle("scrolled", window.scrollY > 30);
  }
  setNavState();

  if (toggle && menu) {
    const closeMenu = () => {
      menu.setAttribute("hidden", "");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
    };
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      if (open) {
        closeMenu();
      } else {
        menu.removeAttribute("hidden");
        toggle.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-label", "Close menu");
      }
    });
    $$("a", menu).forEach((a) => a.addEventListener("click", closeMenu));
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  }

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$("[data-reveal]");
  revealEls.forEach((el) => {
    const d = el.getAttribute("data-reveal-delay");
    if (d) el.style.setProperty("--reveal-delay", d);
  });

  if ("IntersectionObserver" in window) {
    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => revealObs.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Animated counters ---------- */
  const counters = $$(".count");
  function animateCount(el) {
    const target = parseFloat(el.getAttribute("data-count")) || 0;
    const prefix = el.getAttribute("data-prefix") || "";
    const suffix = el.getAttribute("data-suffix") || "";
    if (reduceMotion) {
      el.textContent = prefix + target + suffix;
      return;
    }
    const dur = 1500;
    const start = performance.now();
    function tick(now) {
      const p = clamp((now - start) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.round(target * eased);
      el.textContent = prefix + val + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = prefix + target + suffix;
    }
    requestAnimationFrame(tick);
  }
  if ("IntersectionObserver" in window) {
    const countObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            countObs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((c) => countObs.observe(c));
  } else {
    counters.forEach(animateCount);
  }

  /* ---------- Scrollspy ---------- */
  const navLinks = $$(".nav-links a");
  const spyMap = new Map();
  navLinks.forEach((link) => {
    const id = link.getAttribute("href").slice(1);
    const sec = document.getElementById(id);
    if (sec) spyMap.set(sec, link);
  });
  if ("IntersectionObserver" in window && spyMap.size) {
    const spyObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            navLinks.forEach((l) => l.classList.remove("active"));
            const link = spyMap.get(entry.target);
            if (link) link.classList.add("active");
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    spyMap.forEach((_, sec) => spyObs.observe(sec));
  }

  /* ---------- Scroll-driven: progress, timeline, parallax ---------- */
  const progress = $(".scroll-progress span");
  const timeline = $(".timeline-fill");
  const timelineWrap = $(".timeline");
  const parallaxEls = $$(".parallax");

  function onScroll() {
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    if (progress) {
      const p = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      progress.style.width = clamp(p, 0, 100) + "%";
    }
    if (timeline && timelineWrap) {
      const rect = timelineWrap.getBoundingClientRect();
      const startAt = window.innerHeight * 0.7;
      const total = rect.height + window.innerHeight * 0.2;
      const amount = (startAt - rect.top) / total;
      timeline.style.height = clamp(amount * 100, 0, 100) + "%";
    }
    if (!reduceMotion) {
      const vh = window.innerHeight;
      parallaxEls.forEach((el) => {
        const speed = parseFloat(el.dataset.speed) || 0;
        const rect = el.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) return;
        const center = rect.top + rect.height / 2;
        const fromCenter = (vh / 2 - center) / vh; // -0.5..0.5
        const offset = clamp(fromCenter * speed * 6, -28, 28);
        el.style.transform = "translate3d(0," + offset.toFixed(2) + "px,0)";
      });
    }
  }

  let ticking = false;
  function requestScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      onScroll();
      setNavState();
      ticking = false;
    });
  }
  window.addEventListener("scroll", requestScroll, { passive: true });
  window.addEventListener("resize", requestScroll);
  onScroll();

  /* ---------- Image fallback ---------- */
  $$("img").forEach((img) => {
    img.addEventListener(
      "error",
      () => {
        img.classList.add("image-failed");
        const holder = img.closest(".case-media, .case-thumb, .polaroid-photo, .spread-media, .story-img, .voice-portrait");
        if (holder) holder.classList.add("image-missing");
      },
      { once: true }
    );
  });

  /* ---------- Lightbox ---------- */
  const lightbox = $("#lightbox");
  const lightboxImg = $("#lightbox-img");
  const lightboxClose = $(".lightbox-close");
  let lastFocus = null;

  function openLightbox(src, alt) {
    if (!lightbox) return;
    lastFocus = document.activeElement;
    lightboxImg.src = src;
    lightboxImg.alt = alt || "Project image";
    lightbox.removeAttribute("hidden");
    requestAnimationFrame(() => lightbox.classList.add("open"));
    document.body.style.overflow = "hidden";
    lightboxClose.focus();
  }
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("open");
    document.body.style.overflow = "";
    setTimeout(() => {
      lightbox.setAttribute("hidden", "");
      lightboxImg.src = "";
    }, 300);
    if (lastFocus) lastFocus.focus();
  }

  $$("[data-full]").forEach((card) => {
    card.addEventListener("click", () => {
      const src = card.getAttribute("data-full");
      const img = $("img", card);
      openLightbox(src, img ? img.alt : "");
    });
  });
  if (lightbox) {
    lightboxClose.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !lightbox.hasAttribute("hidden")) closeLightbox();
    });
  }
})();
