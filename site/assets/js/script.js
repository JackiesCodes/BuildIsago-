const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isFinePointer = window.matchMedia('(pointer: fine)').matches;

// Year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// ============================================
// Header scroll state + scroll progress bar
// ============================================
const header = document.getElementById('siteHeader');
const scrollProgress = document.getElementById('scrollProgress');
const backToTop = document.getElementById('backToTop');

const onScroll = () => {
  header.classList.toggle('scrolled', window.scrollY > 20);
  backToTop.classList.toggle('visible', window.scrollY > 600);

  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  scrollProgress.style.width = pct + '%';
};
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
});

// ============================================
// Theme toggle
// ============================================
const themeToggle = document.getElementById('themeToggle');
if (themeToggle && window.BuildIsagoTheme) {
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    window.BuildIsagoTheme.apply(current === 'light' ? 'dark' : 'light');
  });
}

// ============================================
// Mobile nav toggle
// ============================================
const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');
navToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  navToggle.classList.toggle('open', isOpen);
  navToggle.setAttribute('aria-expanded', String(isOpen));
});
mainNav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// ============================================
// Scroll reveal
// ============================================
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
);
revealEls.forEach((el) => revealObserver.observe(el));

// ============================================
// Cursor glow (desktop only)
// ============================================
if (isFinePointer && !prefersReducedMotion) {
  const cursorGlow = document.getElementById('cursorGlow');
  let mouseX = 0, mouseY = 0, glowX = 0, glowY = 0;
  let rafId = null;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursorGlow.classList.add('active');
    if (!rafId) rafId = requestAnimationFrame(updateGlow);
  }, { passive: true });

  window.addEventListener('mouseleave', () => cursorGlow.classList.remove('active'));

  function updateGlow() {
    glowX += (mouseX - glowX) * 0.15;
    glowY += (mouseY - glowY) * 0.15;
    cursorGlow.style.transform = `translate3d(${glowX}px, ${glowY}px, 0)`;
    if (Math.abs(mouseX - glowX) > 0.5 || Math.abs(mouseY - glowY) > 0.5) {
      rafId = requestAnimationFrame(updateGlow);
    } else {
      rafId = null;
    }
  }
}

// ============================================
// Magnetic buttons
// ============================================
if (isFinePointer && !prefersReducedMotion) {
  document.querySelectorAll('.magnetic').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      el.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'translate(0, 0)';
    });
  });
}

// ============================================
// Tilt effect (cards + terminal)
// ============================================
if (isFinePointer && !prefersReducedMotion) {
  document.querySelectorAll('.tilt').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      const rotateX = (-py * 8).toFixed(2);
      const rotateY = (px * 8).toFixed(2);
      el.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg)';
    });
  });
}

// ============================================
// Animated stat counters
// ============================================
const counters = document.querySelectorAll('[data-count-to]');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = parseFloat(el.getAttribute('data-count-to'));
    const suffix = el.getAttribute('data-suffix') || '';

    if (prefersReducedMotion) {
      el.textContent = target + suffix;
    } else {
      const duration = 1200;
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    counterObserver.unobserve(el);
  });
}, { threshold: 0.6 });
counters.forEach((el) => counterObserver.observe(el));

// ============================================
// Terminal typing effect
// ============================================
const terminalBody = document.getElementById('terminalBody');
if (terminalBody) {
  const script = [
    { text: '$ buildisago init studio', cls: 'line-prompt' },
    { text: '✓ software development ready', cls: 'line-ok' },
    { text: '✓ brand identity generated', cls: 'line-ok' },
    { text: '✓ graphic design system linked', cls: 'line-ok' },
    { text: '$ buildisago ship --target tomorrow', cls: 'line-prompt' },
    { text: '> one studio. one story. shipped.', cls: 'line-fade' },
  ];

  if (prefersReducedMotion) {
    terminalBody.innerHTML = script
      .map((l) => `<span class="${l.cls}">${l.text}</span>`)
      .join('\n');
  } else {
    let lineIndex = 0, charIndex = 0;
    const typeSpeed = 28;
    const linePause = 380;
    const loopPause = 2400;

    function typeLine() {
      if (lineIndex >= script.length) {
        setTimeout(() => {
          terminalBody.innerHTML = '';
          lineIndex = 0;
          charIndex = 0;
          typeLine();
        }, loopPause);
        return;
      }
      const current = script[lineIndex];
      if (charIndex === 0) {
        const span = document.createElement('span');
        span.className = current.cls;
        span.textContent = '';
        terminalBody.appendChild(span);
      }
      const spans = terminalBody.querySelectorAll('span:not(.terminal-cursor)');
      const activeSpan = spans[spans.length - 1];
      terminalBody.querySelectorAll('.terminal-cursor').forEach((c) => c.remove());

      if (charIndex <= current.text.length) {
        activeSpan.textContent = current.text.slice(0, charIndex);
        const cursor = document.createElement('span');
        cursor.className = 'terminal-cursor';
        activeSpan.after(cursor);
        charIndex++;
        setTimeout(typeLine, typeSpeed);
      } else {
        terminalBody.appendChild(document.createTextNode('\n'));
        lineIndex++;
        charIndex = 0;
        setTimeout(typeLine, linePause);
      }
    }
    typeLine();
  }
}

// ============================================
// Timeline scroll progress
// ============================================
const timeline = document.getElementById('timeline');
const timelineProgress = document.getElementById('timelineProgress');
if (timeline && timelineProgress) {
  const updateTimeline = () => {
    const rect = timeline.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const total = rect.height;
    const visible = Math.min(viewportH * 0.75, Math.max(0, viewportH * 0.75 - rect.top));
    const pct = total > 0 ? Math.min(Math.max(visible / total, 0), 1) * 100 : 0;
    timelineProgress.style.height = pct + '%';
  };
  updateTimeline();
  window.addEventListener('scroll', updateTimeline, { passive: true });
  window.addEventListener('resize', updateTimeline);
}
