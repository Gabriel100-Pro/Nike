/* ============================================================
   NIKE — JUST DO IT  ·  interações
   ------------------------------------------------------------
     1. Navbar (fundo ao rolar + sombra + menu mobile)
     2. Timeline de entrada da Hero (load)
     3. Parallax do mouse por camadas (fundo / decorativo / tênis / texto)
     4. Trajetória do tênis Hero -> Seção 2 (scroll, reversível, sem fade)
     5. Reveals direcionais ([data-reveal], blur -> sharp)
     6. Entrada dos cards de produto (sequência + blur)
     7. Cards 3D (tilt + luz que acompanha o mouse)
     8. Botões magnéticos ([data-magnetic])
     9. Cursor customizado (desktop, discreto)
    10. Modal de vídeo ("Assista ao filme")
    11. Estatísticas — contagem animada (Intersection Observer)
    12. Celular da seção Nike App (entrada + flutuação + parallax)

   Todos os efeitos de mouse são desativados em telas <= 960px,
   ponteiro grosso (touch) e prefers-reduced-motion.
   ============================================================ */

(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
  // abaixo disto: sem efeitos dependentes de mouse (layout também muda em 960)
  const isMobile = window.matchMedia("(max-width: 960px)").matches;

  const hasGSAP = typeof window.gsap !== "undefined";
  if (hasGSAP && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  /* --------------------------------------------------------
     1. NAVBAR
     -------------------------------------------------------- */
  function initNavbar() {
    const nav = document.getElementById("nav");
    const toggle = document.querySelector(".nav__toggle");
    const menu = document.getElementById("mobileMenu");

    // Fundo escuro/translúcido ao rolar
    const onScroll = () => {
      nav.classList.toggle("nav--scrolled", window.scrollY > 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Menu mobile
    const closeMenu = () => {
      document.body.classList.remove("menu-open");
      toggle.setAttribute("aria-expanded", "false");
    };

    toggle.addEventListener("click", () => {
      const open = document.body.classList.toggle("menu-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    });

    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  }

  /* --------------------------------------------------------
     2. TIMELINE DE ENTRADA DA HERO
        Ordem: pequenos elementos -> título -> descrição -> botão
        O título entra devagar pela lateral (x + opacity), não é fade puro.
     -------------------------------------------------------- */
  function initHeroIntro() {
    const root = document.documentElement;

    // Sem GSAP ou com reduced-motion: revela tudo sem animar.
    if (!hasGSAP || prefersReduced) {
      root.classList.remove("js");
      return;
    }

    gsap.set(
      [
        ".nav__inner",
        ".hero__index",
        ".hero__pagination li",
        ".hero__film",
        ".hero__title .line > span",
        ".hero__title .line > em",
        ".hero__desc",
        ".hero__cta",
        ".shoe-intro",
      ],
      { willChange: "transform, opacity" }
    );

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    // --- pequenos elementos primeiro ---
    tl.from(".nav__inner", { y: -18, autoAlpha: 0, duration: 0.8 })
      .from(".hero__index", { x: -24, autoAlpha: 0, duration: 0.8 }, 0.15)
      .from(
        ".hero__pagination li",
        { x: 24, autoAlpha: 0, duration: 0.6, stagger: 0.08 },
        0.25
      )
      .from(".hero__film", { y: 24, autoAlpha: 0, duration: 0.8 }, 0.35);

    // --- tênis entra sutilmente junto ---
    tl.from(
      ".shoe-intro",
      { autoAlpha: 0, scale: 1.06, xPercent: 10, duration: 1.6, ease: "power2.out" },
      0.2
    );

    // --- depois o título: devagar, pela lateral, com opacity ---
    tl.from(
      ".hero__title .line > span, .hero__title .line > em",
      {
        xPercent: -120,
        autoAlpha: 0,
        duration: 1.6,
        ease: "power4.out",
        stagger: 0.14,
      },
      0.55
    );

    // --- depois a descrição ---
    tl.from(".hero__desc", { y: 26, autoAlpha: 0, duration: 1 }, "-=0.95");

    // --- por último o botão ---
    tl.from(".hero__cta", { y: 26, autoAlpha: 0, duration: 0.9 }, "-=0.7");

    // --- indicador de scroll entra por último, discreto ---
    tl.from(".hero__scroll", { autoAlpha: 0, y: 14, duration: 0.9 }, "-=0.5");

    // O GSAP já aplicou o estado inicial (opacity:0) inline; pode liberar o CSS.
    root.classList.remove("js");

    tl.eventCallback("onComplete", () => {
      gsap.set(
        [".nav__inner", ".hero__index", ".hero__pagination li", ".hero__film",
         ".hero__title .line > span", ".hero__title .line > em",
         ".hero__desc", ".hero__cta", ".shoe-intro"],
        { clearProps: "willChange" }
      );
    });
  }

  /* --------------------------------------------------------
     3. PARALLAX DO MOUSE (com lerp / easing)
        - fundo: movimento muito leve
        - tênis: acompanha com mais intensidade + leve rotação 3D
        - desativado no mobile / ponteiro grosso / reduced-motion
     -------------------------------------------------------- */
  function initMouseParallax() {
    if (isCoarsePointer || isMobile || prefersReduced) return;

    const hero = document.getElementById("hero");
    const bg = document.querySelector(".hero__bg");
    const shoe = document.querySelector(".shoe-parallax");
    const mark = document.querySelector(".hero__watermark");
    const content = document.querySelector(".hero__content");
    if (!hero || !bg || !shoe) return;

    // alvo (target) e valor atual (current) — a diferença é suavizada por lerp
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    const EASE = 0.055; // quanto menor, mais suave/lento
    let active = false;
    let rafId = null;

    // profundidade por camada (px de deslocamento máx.):
    //   fundo  -> mínimo    | decorativo -> intermediário
    //   tênis  -> maior      | texto      -> quase imperceptível
    const DEPTH = {
      bg: 10,
      mark: 26,
      shoe: { x: 46, y: 34, rx: 6, ry: 10 },
      text: 6,
    };

    const onMove = (e) => {
      const r = hero.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!active) {
        active = true;
        loop();
      }
    };

    const onLeave = () => {
      target.x = 0;
      target.y = 0;
    };

    function loop() {
      current.x += (target.x - current.x) * EASE;
      current.y += (target.y - current.y) * EASE;

      const cx = current.x;
      const cy = current.y;

      // fundo — deslocamento mínimo (mantém o scale do CSS)
      bg.style.transform =
        `translate3d(${cx * DEPTH.bg}px, ${cy * DEPTH.bg}px, 0) scale(1.12)`;

      // marca-d'água "2" — intensidade intermediária
      // (o CSS centraliza no eixo Y com translateY(-50%); preservamos isso)
      if (mark) {
        mark.style.transform =
          `translateY(-50%) translate3d(${cx * DEPTH.mark}px, ${cy * DEPTH.mark}px, 0)`;
      }

      // tênis — mais intenso + leve rotação 3D conforme a posição do mouse
      shoe.style.transform =
        `translate3d(${cx * DEPTH.shoe.x}px, ${cy * DEPTH.shoe.y}px, 0) ` +
        `rotateX(${cy * -DEPTH.shoe.rx}deg) rotateY(${cx * DEPTH.shoe.ry}deg)`;

      // texto — movimento quase imperceptível (sensação de profundidade)
      if (content) {
        content.style.transform =
          `translate3d(${cx * DEPTH.text}px, ${cy * DEPTH.text}px, 0)`;
      }

      if (
        Math.abs(target.x - current.x) > 0.0004 ||
        Math.abs(target.y - current.y) > 0.0004
      ) {
        rafId = requestAnimationFrame(loop);
      } else {
        active = false;
        cancelAnimationFrame(rafId);
      }
    }

    hero.addEventListener("mousemove", onMove);
    hero.addEventListener("mouseleave", onLeave);
  }

  /* --------------------------------------------------------
     4. TÊNIS: TRAJETÓRIA CONTÍNUA HERO -> SEÇÃO 2 (ligada ao scroll)

        A) Timeline do recuo do conteúdo da Hero (mantida).
        B) Timeline da VIAGEM do tênis: o MESMO elemento sai da posição
           da Hero e pousa exatamente no espaço da coluna esquerda da
           seção 2 (.performance__shoe-slot), girando e mudando de escala
           progressivamente. Tudo com scrub -> 100% reversível, sem fade.
     -------------------------------------------------------- */
  function initShoeScroll() {
    if (!hasGSAP || !window.ScrollTrigger) return;

    const shoeScroll = document.querySelector(".shoe-scroll");

    /* ---- A) Recuo do conteúdo da Hero (profundidade) ---- */
    const grid = document.querySelector(".hero__grid");
    const heroMedia = document.querySelector(".hero__media");
    if (grid || heroMedia) {
      const tlHero = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: "#hero",
          start: "top top",
          end: "bottom top",
          scrub: 1.1,
          invalidateOnRefresh: true,
        },
      });
      if (grid) tlHero.to(grid, { yPercent: -14, autoAlpha: 0.1, filter: "blur(6px)" }, 0);
      if (heroMedia) tlHero.to(heroMedia, { scale: 1.08, yPercent: 3 }, 0);
    }

    /* ---- B) Viagem do tênis até a seção 2 ---- */
    if (!shoeScroll) return;

    const anchor = document.querySelector(".shoe-anchor");
    const slot = document.querySelector(".performance__shoe-slot");
    const section2 = document.querySelector("#performance");

    // Fallback: se não achar o alvo, mantém o comportamento antigo (desce, sem sumir).
    if (!anchor || !slot || !section2) {
      gsap.to(shoeScroll, {
        y: () => window.innerHeight * 0.9,
        xPercent: -12,
        rotation: 8,
        scale: 0.82,
        ease: "none",
        scrollTrigger: {
          trigger: "#hero",
          start: "top top",
          end: "bottom top",
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
      return;
    }

    // Delta (centro do slot - centro do anchor). O anchor está "ancorado" ao
    // topo do documento e o slot ao fluxo normal -> a diferença é constante,
    // independente do scroll. Recalculado a cada ScrollTrigger.refresh().
    const travel = () => {
      const a = anchor.getBoundingClientRect();
      const s = slot.getBoundingClientRect();
      const bleed = isMobile ? 1.0 : 1.22; // desktop sangra um pouco p/ o centro
      const cap = isMobile ? 1.0 : 1.15;
      const scale = a.width ? Math.min(cap, (s.width * bleed) / a.width) : 0.7;
      return {
        x: s.left + s.width / 2 - (a.left + a.width / 2),
        y: s.top + s.height / 2 - (a.top + a.height / 2),
        scale: scale,
      };
    };

    gsap.to(shoeScroll, {
      x: () => travel().x,
      y: () => travel().y,
      rotation: isMobile ? 10 : 16,   // giro progressivo, suave, proporcional ao scroll
      scaleX: () => -travel().scale,   // espelho horizontal:
      scaleY: () => travel().scale,    //   traseira/superior -> ESQUERDA, ponta -> DIREITA
      ease: "none",
      scrollTrigger: {
        trigger: "#performance",
        start: "top bottom",          // começa assim que o usuário desce
        end: "top top",               // 1 viewport inteira de scrub -> o tênis
        scrub: 1,                     //   fica sempre visível, sem "sair da tela"
        invalidateOnRefresh: true,
      },
    });
  }

  /* --------------------------------------------------------
     5. REVEALS DIRECIONAIS  ([data-reveal])
        - esquerda entra da esquerda, direita da direita,
          "up" entra de baixo p/ cima.
        - data-reveal-delay controla o pequeno atraso de cada item
          -> sequência cinematográfica.
        - toggleActions "...reverse": reproduz de novo ao voltar à seção.
     -------------------------------------------------------- */
  function initReveals() {
    const items = document.querySelectorAll("[data-reveal]");

    // Sem GSAP ou reduced-motion: apenas revela tudo, sem animar.
    if (!hasGSAP || !window.ScrollTrigger || prefersReduced) {
      items.forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      return;
    }

    items.forEach((el) => {
      const dir = el.dataset.reveal || "up";
      const delay = parseFloat(el.dataset.revealDelay) || 0;

      // velocidades diferentes por peso do elemento -> profundidade
      const isBig = /^H[1-3]$/.test(el.tagName);
      const dist = isBig ? 90 : 54;
      const duration = isBig ? 1.6 : 1.15;

      const vars = {
        autoAlpha: 0,
        duration: duration,
        delay: delay,
        ease: isBig ? "expo.out" : "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 86%",
          toggleActions: "play none none reverse",
        },
      };
      // blur -> sharp apenas nos elementos "pesados" (evita custo em textos pequenos)
      if (isBig) vars.filter = "blur(8px)";
      if (dir === "left") vars.x = -dist;
      else if (dir === "right") vars.x = dist;
      else vars.y = dist * 0.7; // "up" desloca menos, sobe suave

      gsap.from(el, vars);
    });
  }

  /* --------------------------------------------------------
     6. ENTRADA DOS CARDS DE PRODUTO
        de baixo p/ cima + leve escala + blur muito sutil + stagger.
     -------------------------------------------------------- */
  function initProductsEntrance() {
    const cards = document.querySelectorAll(".product");

    if (!hasGSAP || !window.ScrollTrigger || prefersReduced) {
      cards.forEach((el) => (el.style.opacity = "1"));
      return;
    }

    gsap.set(".product", { transformOrigin: "50% 100%" });

    gsap.from(".product", {
      y: 64,
      scale: 0.96,               // mudança de escala pequena
      autoAlpha: 0,
      filter: "blur(9px)",        // blur -> sharp
      duration: 1.35,
      ease: "expo.out",           // desaceleração longa e elegante
      stagger: 0.18,             // card 1 -> 2 -> 3, sequência clara
      scrollTrigger: {
        trigger: ".products__grid",
        start: "top 80%",
        toggleActions: "play none none reverse",
      },
    });
  }

  /* --------------------------------------------------------
     7. CARDS 3D (inclinação pelo mouse + luz que acompanha)
        - lerp p/ suavizar; volta sozinho ao sair.
        - desativado no mobile / ponteiro grosso / reduced-motion.
     -------------------------------------------------------- */
  function initProductTilt() {
    if (isCoarsePointer || isMobile || prefersReduced) return;

    document.querySelectorAll(".product").forEach((card) => {
      const inner = card.querySelector(".product__inner");
      if (!inner) return;

      const cur = { rx: 0, ry: 0 };
      const tgt = { rx: 0, ry: 0 };
      let running = false;

      const onMove = (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width; // 0..1
        const py = (e.clientY - r.top) / r.height; // 0..1
        tgt.ry = (px - 0.5) * 10; // rotateY ~±5deg  (sutil)
        tgt.rx = (py - 0.5) * -8; // rotateX ~±4deg
        card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
        card.style.setProperty("--my", (py * 100).toFixed(1) + "%");
        card.classList.add("is-hover");
        if (!running) {
          running = true;
          loop();
        }
      };

      const onLeave = () => {
        tgt.rx = 0;
        tgt.ry = 0;
        card.classList.remove("is-hover");
        if (!running) {
          running = true;
          loop();
        }
      };

      const loop = () => {
        cur.rx += (tgt.rx - cur.rx) * 0.12;
        cur.ry += (tgt.ry - cur.ry) * 0.12;
        inner.style.transform =
          `rotateX(${cur.rx.toFixed(2)}deg) rotateY(${cur.ry.toFixed(2)}deg)`;

        if (
          Math.abs(tgt.rx - cur.rx) > 0.01 ||
          Math.abs(tgt.ry - cur.ry) > 0.01
        ) {
          requestAnimationFrame(loop);
        } else {
          inner.style.transform = "rotateX(0deg) rotateY(0deg)";
          running = false;
        }
      };

      card.addEventListener("mousemove", onMove);
      card.addEventListener("mouseleave", onLeave);
    });
  }

  /* --------------------------------------------------------
     8. BOTÕES MAGNÉTICOS  ([data-magnetic])
        o botão é levemente atraído pelo cursor; volta suave ao sair.
        Hover premium (escala/brilho/ícone) fica por conta do CSS.
     -------------------------------------------------------- */
  function initMagnetic() {
    if (isCoarsePointer || isMobile || prefersReduced) return;

    const isRound = (el) => el.classList.contains("hero__cta-btn");

    document.querySelectorAll("[data-magnetic]").forEach((btn) => {
      const cur = { x: 0, y: 0, s: 1 };
      const tgt = { x: 0, y: 0, s: 1 };
      const STRENGTH = 0.28;   // intensidade pequena
      const HOVER_SCALE = isRound(btn) ? 1.08 : 1.03; // escala sutil no hover
      let running = false;

      const onMove = (e) => {
        const r = btn.getBoundingClientRect();
        tgt.x = (e.clientX - (r.left + r.width / 2)) * STRENGTH;
        tgt.y = (e.clientY - (r.top + r.height / 2)) * STRENGTH;
        tgt.s = HOVER_SCALE;
        if (!running) {
          running = true;
          loop();
        }
      };

      const onLeave = () => {
        tgt.x = 0;
        tgt.y = 0;
        tgt.s = 1;
        if (!running) {
          running = true;
          loop();
        }
      };

      const loop = () => {
        cur.x += (tgt.x - cur.x) * 0.2;
        cur.y += (tgt.y - cur.y) * 0.2;
        cur.s += (tgt.s - cur.s) * 0.2;
        btn.style.transform =
          `translate(${cur.x.toFixed(2)}px, ${cur.y.toFixed(2)}px) scale(${cur.s.toFixed(3)})`;

        if (
          Math.abs(tgt.x - cur.x) > 0.1 ||
          Math.abs(tgt.y - cur.y) > 0.1 ||
          Math.abs(tgt.s - cur.s) > 0.001
        ) {
          requestAnimationFrame(loop);
        } else {
          btn.style.transform = ""; // volta ao estado do CSS
          running = false;
        }
      };

      btn.addEventListener("mousemove", onMove);
      btn.addEventListener("mouseleave", onLeave);
    });
  }

  /* --------------------------------------------------------
     9. CURSOR CUSTOMIZADO (desktop, extremamente discreto)
        anel + ponto que seguem o mouse com lerp; o anel cresce
        suavemente sobre links / botões / cards / imagens.
        Nunca no mobile / ponteiro grosso / reduced-motion.
     -------------------------------------------------------- */
  function initCursor() {
    if (isCoarsePointer || isMobile || prefersReduced) return;

    const cursor = document.querySelector(".cursor");
    if (!cursor) return;

    document.body.classList.add("has-cursor");

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const cur = { x: pos.x, y: pos.y };
    let running = false;
    let visible = false;

    const onMove = (e) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      if (!visible) {
        visible = true;
        cursor.style.opacity = "1";
      }
      if (!running) {
        running = true;
        loop();
      }
    };

    const loop = () => {
      cur.x += (pos.x - cur.x) * 0.18;
      cur.y += (pos.y - cur.y) * 0.18;
      cursor.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`;

      if (Math.abs(pos.x - cur.x) > 0.1 || Math.abs(pos.y - cur.y) > 0.1) {
        requestAnimationFrame(loop);
      } else {
        running = false;
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", () => {
      cursor.style.opacity = "0";
      visible = false;
    });

    // estado ativo sobre elementos interativos (delegação de eventos)
    const interactive = "a, button, [data-magnetic], .product, img, .hero__film";
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(interactive)) document.body.classList.add("cursor-active");
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest(interactive) && !e.relatedTarget?.closest(interactive)) {
        document.body.classList.remove("cursor-active");
      }
    });
  }

  /* --------------------------------------------------------
     10. MODAL DE VÍDEO (bloco "Assista ao filme" da Hero)
     -------------------------------------------------------- */
  function initVideoModal() {
    const trigger = document.querySelector(".hero__film");
    const modal = document.getElementById("videoModal");
    if (!trigger || !modal) return;

    const video = modal.querySelector(".modal__video");
    const closeBtn = modal.querySelector(".modal__close");
    let lastFocus = null;

    const open = (e) => {
      if (e) e.preventDefault();
      lastFocus = document.activeElement;
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
      // toca só após o clique (nunca antes); se o navegador bloquear, há controles
      if (video) {
        const p = video.play();
        if (p && typeof p.catch === "function") p.catch(function () {});
      }
      if (closeBtn) closeBtn.focus();
    };

    const close = () => {
      if (!modal.classList.contains("is-open")) return;
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
      if (video) {
        video.pause();
        video.currentTime = 0; // volta ao início ao fechar
      }
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    };

    trigger.addEventListener("click", open);
    modal
      .querySelectorAll("[data-modal-close]")
      .forEach((el) => el.addEventListener("click", close));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }

  /* --------------------------------------------------------
     11. ESTATÍSTICAS — CONTAGEM ANIMADA (Intersection Observer)
         JavaScript puro. Dispara uma única vez, quando a área
         entra no viewport. Entrada sutil dos indicadores
         (opacity 0 -> 1, translateY 20px -> 0) + contagem 0 -> alvo
         com easing suave (~1,8s).
     -------------------------------------------------------- */
  function initStatsCounter() {
    const wrap = document.querySelector("[data-stats]");
    if (!wrap) return;

    const items = Array.prototype.slice.call(wrap.querySelectorAll(".stats__item"));
    const values = Array.prototype.slice.call(wrap.querySelectorAll("[data-count-to]"));
    const nf = new Intl.NumberFormat("pt-BR");

    const finalText = (el) =>
      nf.format(parseInt(el.dataset.countTo, 10)) + (el.dataset.countSuffix || "");

    // Sem suporte a IO ou com reduced-motion: mostra o estado final direto.
    if (prefersReduced || !("IntersectionObserver" in window)) {
      values.forEach((el) => { el.textContent = finalText(el); });
      return;
    }

    // Estado inicial da entrada — aplicado por JS (sem depender da classe .js).
    items.forEach((el, i) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
      el.style.transitionDelay = (i * 0.08).toFixed(2) + "s";
    });
    values.forEach((el) => { el.textContent = "0"; });

    const DURATION = 1800;
    const easeOut = (t) => 1 - Math.pow(1 - t, 3); // suave, sem exagero

    const countUp = (el) => {
      const end = parseInt(el.dataset.countTo, 10);
      const suffix = el.dataset.countSuffix || "";
      const t0 = performance.now();

      const step = (now) => {
        const p = Math.min(1, (now - t0) / DURATION);
        const current = Math.round(easeOut(p) * end);
        el.textContent = nf.format(current) + (p >= 1 ? suffix : "");
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          obs.unobserve(entry.target); // acontece somente uma vez
          items.forEach((el) => {
            el.style.opacity = "1";
            el.style.transform = "none";
          });
          values.forEach(countUp);
        });
      },
      { threshold: 0.4 }
    );

    io.observe(wrap);
  }

  /* --------------------------------------------------------
     12. CELULAR DA SEÇÃO NIKE APP
         a) Entrada pelo scroll (Intersection Observer) — uma vez.
         b) Depois da entrada, libera a flutuação contínua (CSS).
         c) Parallax do mouse (desktop) numa camada separada, para
            não conflitar com a entrada nem com a flutuação.
     -------------------------------------------------------- */
  function initAppPhone() {
    const enter = document.querySelector("[data-phone-enter]");
    if (!enter) return;

    /* ---- a/b) Entrada pelo scroll + flutuação ---- */
    if (!prefersReduced && "IntersectionObserver" in window) {
      enter.style.opacity = "0";
      enter.style.transform = "translateY(80px) scale(0.85) rotateZ(-5deg)";
      enter.style.transition =
        "opacity 1.1s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)";

      const io = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            obs.unobserve(entry.target);
            enter.style.opacity = "1";
            enter.style.transform = "translateY(0) scale(1) rotateZ(0deg)";
            enter.classList.add("is-in"); // libera a animação de flutuação
          });
        },
        { threshold: 0.25 }
      );
      io.observe(enter);
    } else {
      enter.classList.add("is-in");
    }

    /* ---- c) Parallax do mouse (somente desktop) ---- */
    if (isCoarsePointer || isMobile || prefersReduced) return;

    const layer = enter.querySelector("[data-phone-parallax]");
    const scene = document.getElementById("app");
    if (!layer || !scene) return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    const EASE = 0.06;
    const MAX = { x: 8, y: 8, rx: 3, ry: 4 }; // deslocamento/rotação bem pequenos
    let running = false;

    const onMove = (e) => {
      const r = scene.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!running) {
        running = true;
        loop();
      }
    };

    const onLeave = () => {
      target.x = 0;
      target.y = 0;
    };

    function loop() {
      current.x += (target.x - current.x) * EASE;
      current.y += (target.y - current.y) * EASE;

      layer.style.transform =
        `translate3d(${(current.x * MAX.x).toFixed(2)}px, ${(current.y * MAX.y).toFixed(2)}px, 0) ` +
        `rotateX(${(current.y * -MAX.rx).toFixed(2)}deg) rotateY(${(current.x * MAX.ry).toFixed(2)}deg)`;

      if (
        Math.abs(target.x - current.x) > 0.0005 ||
        Math.abs(target.y - current.y) > 0.0005
      ) {
        requestAnimationFrame(loop);
      } else {
        running = false;
      }
    }

    scene.addEventListener("mousemove", onMove);
    scene.addEventListener("mouseleave", onLeave);
  }

  /* --------------------------------------------------------
     BOOT
     -------------------------------------------------------- */
  function boot() {
    initNavbar();
    initHeroIntro();
    initMouseParallax();
    initShoeScroll();
    initReveals();
    initProductsEntrance();
    initProductTilt();
    initMagnetic();
    initCursor();
    initVideoModal();
    initStatsCounter();
    initAppPhone();

    if (hasGSAP && window.ScrollTrigger) {
      // recalcula posições após o carregamento das imagens/fontes
      window.addEventListener("load", () => ScrollTrigger.refresh());
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => ScrollTrigger.refresh());
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
