(function initConfirmaeAnimations() {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  function setupHeroVideo() {
    const hero = document.querySelector(".hero-section");

    if (!hero || prefersReducedMotion) {
      return;
    }

    const videoLayer = document.createElement("div");
    videoLayer.className = "hero-video-layer";
    videoLayer.setAttribute("aria-hidden", "true");

    const video = document.createElement("video");
    video.className = "hero-background-video";

    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "metadata";

    video.setAttribute("muted", "");
    video.setAttribute("autoplay", "");
    video.setAttribute("loop", "");
    video.setAttribute("playsinline", "");

    const source = document.createElement("source");

    // Coloque o arquivo de vídeo em assets/hero-eventos.mp4.
    source.src = "assets/hero-eventos.mp4";
    source.type = "video/mp4";

    video.appendChild(source);
    videoLayer.appendChild(video);
    hero.prepend(videoLayer);

    video.addEventListener("error", () => {
      videoLayer.classList.add("video-unavailable");
      video.remove();
    });

    const playPromise = video.play();

    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        videoLayer.classList.add("video-paused");
      });
    }
  }

  function setupRevealAnimations() {
    const revealElements = document.querySelectorAll(".reveal-up");

    if (!revealElements.length) {
      return;
    }

    if (
      prefersReducedMotion ||
      typeof IntersectionObserver === "undefined"
    ) {
      revealElements.forEach((element) => {
        element.classList.add("is-visible");
      });

      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -40px 0px"
      }
    );

    revealElements.forEach((element, index) => {
      element.style.setProperty(
        "--reveal-delay",
        `${Math.min(index * 35, 220)}ms`
      );

      observer.observe(element);
    });
  }

  setupHeroVideo();
  setupRevealAnimations();
})();
