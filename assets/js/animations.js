(function initConfirmaeAnimations() {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    document.querySelectorAll(".reveal-up").forEach((element) => {
      element.classList.add("is-visible");
    });
    return;
  }

  /* =========================================================
     1) REVEAL-UP
     Elementos com .reveal-up aparecem suavemente ao entrar
     na viewport (já existia — mantido igual).
     ========================================================= */
  const revealElements = document.querySelectorAll(".reveal-up");

  if (revealElements.length) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -40px 0px"
      }
    );

    revealElements.forEach((element, index) => {
      element.style.setProperty("--reveal-delay", `${Math.min(index * 35, 220)}ms`);
      revealObserver.observe(element);
    });
  }

  /* =========================================================
     2) COUNT-UP
     Números do hero da home (.hero-mini-stats strong)
     animam de 0 até o valor real quando ficam visíveis.
     ========================================================= */
  const countUpElements = document.querySelectorAll(".hero-mini-stats strong");

  if (!countUpElements.length) {
    return;
  }

  const countUpObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const element = entry.target;
        const finalText = element.textContent.trim();
        const target = parseInt(finalText, 10);

        countUpObserver.unobserve(element);

        // Se não for número ou for 0, não anima
        if (Number.isNaN(target) || target === 0) {
          return;
        }

        element.textContent = "0";

        const duration = 950;
        const startTime = performance.now();

        function step(timestamp) {
          const progress = Math.min((timestamp - startTime) / duration, 1);

          // easeOutCubic — a animação desacelera no final
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.floor(eased * target);

          element.textContent = String(current);

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            element.textContent = finalText;
          }
        }

        requestAnimationFrame(step);
      });
    },
    { threshold: 0.5 }
  );

  countUpElements.forEach((element) => {
    countUpObserver.observe(element);
  });
})();
