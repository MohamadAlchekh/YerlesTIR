tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "sans-serif"],
      },
      colors: {
        canvas: "#020617",
        panel: "#081120",
        edge: "#162235",
        ink: "#e5eefb",
        muted: "#8ea3bf",
        brand: {
          blue: "#3b82f6",
          orange: "#f97316",
        },
      },
      boxShadow: {
        ambient: "0 30px 90px rgba(2, 6, 23, 0.55)",
        glass: "0 18px 60px rgba(15, 23, 42, 0.32)",
      },
    },
  },
};

document.addEventListener("DOMContentLoaded", () => {
  const menuButton = document.getElementById("menuButton");
  const mobileMenu = document.getElementById("mobileMenu");
  const scrollProgress = document.getElementById("scrollProgress");
  const progressRing = document.getElementById("progressRing");
  const progressValue = document.getElementById("progressValue");
  const navLinks = document.querySelectorAll("[data-nav-target]");
  const revealItems = document.querySelectorAll(".reveal");
  const orbOne = document.getElementById("orbOne");
  const orbTwo = document.getElementById("orbTwo");
  const orbThree = document.getElementById("orbThree");
  const ringLength = 276.46;

  const state = {
    pointerX: window.innerWidth / 2,
    pointerY: window.innerHeight / 2,
    currentX: window.innerWidth / 2,
    currentY: window.innerHeight / 2,
  };

  const renderIcons = () => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  };

  const closeMobileMenu = () => {
    if (!mobileMenu || !menuButton) return;

    mobileMenu.classList.add("hidden");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.innerHTML = '<i data-lucide="menu" class="h-5 w-5"></i>';
    renderIcons();
  };

  const flashSectionTitle = (section) => {
    const title = section?.querySelector("[data-highlightable]");
    if (!title) return;

    title.classList.remove("title-flash");
    void title.offsetWidth;
    title.classList.add("title-flash");
    window.setTimeout(() => title.classList.remove("title-flash"), 1500);
  };

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const selector = link.getAttribute("data-nav-target");
      if (!selector || !selector.startsWith("#")) {
        closeMobileMenu();
        return;
      }

      const target = document.querySelector(selector);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      closeMobileMenu();
      window.setTimeout(() => flashSectionTitle(target), 500);
    });
  });

  if (menuButton && mobileMenu) {
    menuButton.addEventListener("click", () => {
      const expanded = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!expanded));
      mobileMenu.classList.toggle("hidden");
      menuButton.innerHTML = expanded
        ? '<i data-lucide="menu" class="h-5 w-5"></i>'
        : '<i data-lucide="x" class="h-5 w-5"></i>';
      renderIcons();
    });
  }

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  revealItems.forEach((item) => revealObserver.observe(item));

  const updateScrollProgress = () => {
    if (!scrollProgress || !progressRing || !progressValue) return;

    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const rawProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    const progress = Math.min(Math.max(rawProgress, 0), 1);
    const percent = Math.round(progress * 100);

    progressRing.style.strokeDashoffset = String(ringLength - ringLength * progress);
    progressValue.textContent = percent + "%";

    const shouldShow = progress > 0.5;
    scrollProgress.classList.toggle("opacity-0", !shouldShow);
    scrollProgress.classList.toggle("translate-y-4", !shouldShow);
    scrollProgress.classList.toggle("pointer-events-none", !shouldShow);
    scrollProgress.classList.toggle("opacity-100", shouldShow);
    scrollProgress.classList.toggle("translate-y-0", shouldShow);
    scrollProgress.classList.toggle("pointer-events-auto", shouldShow);
  };

  if (scrollProgress) {
    scrollProgress.addEventListener("click", () => {
      document.getElementById("home")?.scrollIntoView({ behavior: "smooth" });
    });
  }

  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  window.addEventListener("resize", updateScrollProgress);

  window.addEventListener("mousemove", (event) => {
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
  }, { passive: true });

  const animateBackground = () => {
    state.currentX += (state.pointerX - state.currentX) * 0.5;
    state.currentY += (state.pointerY - state.currentY) * 0.5;

    document.documentElement.style.setProperty("--mx", state.currentX + "px");
    document.documentElement.style.setProperty("--my", state.currentY + "px");

    const normalizedX = (state.currentX / window.innerWidth - 0.5) * 2;
    const normalizedY = (state.currentY / window.innerHeight - 0.5) * 2;

    if (orbOne) {
      orbOne.style.transform = `translate(${normalizedX * 34}px, ${normalizedY * 24}px)`;
    }
    if (orbTwo) {
      orbTwo.style.transform = `translate(${normalizedX * -28}px, ${normalizedY * -18}px)`;
    }
    if (orbThree) {
      orbThree.style.transform = `translate(${normalizedX * 18}px, ${normalizedY * -26}px)`;
    }

    window.requestAnimationFrame(animateBackground);
  };

  renderIcons();
  updateScrollProgress();
  animateBackground();
});
