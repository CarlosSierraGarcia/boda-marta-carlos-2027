(() => {
  'use strict';
  const target = new Date('2027-05-15T18:30:00+02:00').getTime();
  const nodes = ['cd-days', 'cd-hours', 'cd-min', 'cd-sec'].map(id => document.getElementById(id));
  const tick = () => {
    const seconds = Math.max(0, Math.floor((target - Date.now()) / 1000));
    const values = [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60];
    nodes.forEach((node, i) => { if (node) node.textContent = String(values[i]).padStart(2, '0'); });
  };
  tick();
  setInterval(tick, 1000);
  const header = document.getElementById('main-nav');
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');
  const setOpen = (open) => {
    header.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.hidden = !open;
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) { setOpen(false); toggle.focus(); }
  });
  document.addEventListener('click', event => { if (!header.contains(event.target)) setOpen(false); });
  const desktop = window.matchMedia('(min-width: 761px)');
  desktop.addEventListener('change', () => { if (desktop.matches) setOpen(false); });
})();

// Sliders independientes: miniaturas, flechas, teclado, tacto y avance cada 5 s.
(() => {
  document.querySelectorAll('[data-slider]').forEach(gallery => {
    const get = name => gallery.querySelector(`[data-slider-${name}]`);
    const image = get('image');
    const caption = get('caption');
    const stage = get('stage');
    const counter = get('counter');
    const previous = get('prev');
    const next = get('next');
    const autoplayButton = get('autoplay');
    const choices = Array.from(gallery.querySelectorAll('[data-slider-choice]'));
    if (!image || !caption || !stage || !counter || !previous || !next || !autoplayButton || !choices.length) return;
    let current = 0;
    let displayed = 0;
    let changeVersion = 0;
    let timer = null;
    let hovered = false;
    let focused = false;
    let autoplay = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function schedule() {
      clearTimeout(timer);
      timer = null;
      if (autoplay && !hovered && !focused && !document.hidden) {
        timer = setTimeout(() => show(current + 1), 5000);
      }
    }
    function updateAutoplay() {
      autoplayButton.textContent = autoplay ? 'Pausar' : 'Reproducir';
      autoplayButton.setAttribute('aria-label', autoplay ? 'Pausar avance automático' : 'Reproducir avance automático');
      caption.setAttribute('aria-live', autoplay ? 'off' : 'polite');
      counter.setAttribute('aria-live', autoplay ? 'off' : 'polite');
      schedule();
    }
    function updateSelection() {
      const choice = choices[current];
      caption.textContent = choice.dataset.caption;
      counter.textContent = `${current + 1} / ${choices.length}`;
      choices.forEach((button, i) => button.setAttribute('aria-pressed', String(i === current)));
    }
    async function show(index) {
      current = (index + choices.length) % choices.length;
      const version = ++changeVersion;
      const choice = choices[current];
      clearTimeout(timer);
      timer = null;
      image.classList.remove('is-changing');
      if (image.getAttribute('src') === choice.dataset.image) {
        displayed = current;
        updateSelection();
        schedule();
        return;
      }
      try {
        const preload = new Image();
        await new Promise((resolve, reject) => {
          preload.onload = resolve;
          preload.onerror = () => reject(new Error('No se pudo cargar la imagen'));
          preload.src = choice.dataset.image;
        });
        if (preload.decode) await preload.decode();
        if (version !== changeVersion) return;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!reduceMotion) {
          image.classList.add('is-changing');
          await new Promise(resolve => setTimeout(resolve, 370));
        }
        if (version !== changeVersion) return;
        image.src = choice.dataset.image;
        image.alt = choice.dataset.alt;
        if (image.decode) await image.decode();
        if (version !== changeVersion) return;
        displayed = current;
        updateSelection();
        image.classList.remove('is-changing');
        schedule();
      } catch (error) {
        if (version !== changeVersion) return;
        current = displayed;
        image.classList.remove('is-changing');
        updateSelection();
        schedule();
      }
    }
    choices.forEach((choice, index) => choice.addEventListener('click', () => show(index)));
    previous.addEventListener('click', () => show(current - 1));
    next.addEventListener('click', () => show(current + 1));
    gallery.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        show(current + (event.key === 'ArrowLeft' ? -1 : 1));
      }
    });
    let pointerStart = null;
    stage.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' || event.target.closest('button')) return;
      pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
      stage.setPointerCapture(event.pointerId);
    });
    stage.addEventListener('pointerup', event => {
      if (!pointerStart || pointerStart.id !== event.pointerId) return;
      const dx = event.clientX - pointerStart.x;
      const dy = event.clientY - pointerStart.y;
      pointerStart = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) show(current + (dx < 0 ? 1 : -1));
    });
    stage.addEventListener('pointercancel', () => { pointerStart = null; });
    autoplayButton.addEventListener('click', () => { autoplay = !autoplay; updateAutoplay(); });
    gallery.addEventListener('mouseenter', () => { hovered = true; schedule(); });
    gallery.addEventListener('mouseleave', () => { hovered = false; schedule(); });
    gallery.addEventListener('focusin', () => { focused = true; schedule(); });
    gallery.addEventListener('focusout', event => {
      focused = gallery.contains(event.relatedTarget);
      schedule();
    });
    document.addEventListener('visibilitychange', schedule);
    image.draggable = false;
    updateAutoplay();
    show(0);
  });
})();

// Aparición suave, una sola vez, de los titulares al entrar en pantalla.
(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      if (entry.boundingClientRect.top < 0 || !entry.target.animate) return;
      entry.target.animate(
        [{ opacity: 0.35, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 850, easing: 'cubic-bezier(.2,.65,.3,1)', fill: 'none' }
      );
    });
  }, { threshold: 0.18 });
  document.querySelectorAll('.welcome h2, .story-title, .venue-paper-heading, .stay-heading, .sunday-heading, .dinner-copy, .gift-inner').forEach(element => observer.observe(element));
})();

// Tres pájaros vuelan una sola vez y se posan sobre el tejado de la ermita.
(() => {
  const cover = document.querySelector('.landscape-cover');
  const artwork = document.querySelector('.landscape-art img');
  const birds = Array.from(document.querySelectorAll('.hero-bird'));
  if (!cover || !artwork || !birds.length) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const flights = new Map();
  let started = false;
  let ceremonyComplete = false;
  let phaseVersion = 0;
  const guests = document.querySelector('[data-ceremony-guests]');
  const couple = document.querySelector('[data-ceremony-couple]');
  const replay = document.getElementById('ceremony-replay');
  function fraction(value, fallback) {
    if (value && value.endsWith('%')) return parseFloat(value) / 100;
    return ({ left: 0, top: 0, center: 0.5, right: 1, bottom: 1 })[value] ?? fallback;
  }
  function positions() {
    const box = cover.getBoundingClientRect();
    const scale = Math.max(box.width / artwork.naturalWidth, box.height / artwork.naturalHeight);
    const position = getComputedStyle(artwork).objectPosition.split(/\s+/);
    const offsetX = (box.width - artwork.naturalWidth * scale) * fraction(position[0], 0.5);
    const offsetY = (box.height - artwork.naturalHeight * scale) * fraction(position[1], 1);
    const live = document.querySelector('.hero-living-scene');
    if (live) {
      live.style.left = `${offsetX}px`;
      live.style.top = `${offsetY}px`;
      live.style.width = `${artwork.naturalWidth * scale}px`;
      live.style.height = `${artwork.naturalHeight * scale}px`;
      live.parentElement.classList.add('is-ready');
    }
    return { box, points: birds.map(bird => ({
      x: offsetX + Number(bird.dataset.perchX) * scale,
      y: offsetY + Number(bird.dataset.perchY) * scale
    })) };
  }
  function place(fly) {
    if (!artwork.naturalWidth || !artwork.naturalHeight) return;
    const { box, points } = positions();
    birds.forEach((bird, index) => {
      flights.get(bird)?.cancel();
      flights.delete(bird);
      const point = points[index];
      const size = bird.getBoundingClientRect().width || 25;
      bird.style.left = `${point.x - size * 0.74}px`;
      bird.style.top = `${point.y - size * 0.75}px`;
      bird.style.opacity = '1';
      if (!fly || motion.matches || !bird.animate || point.x < 0 || point.x > box.width) {
        bird.classList.add('is-landed');
        return;
      }
      bird.classList.remove('is-landed');
      const route = [
        [-55 - index * 30, box.height * 0.1 + index * 17, -8],
        [box.width * 0.23, Math.max(50, point.y - 140 - index * 13), 5],
        [box.width * 0.52, Math.max(65, point.y - 110), -4],
        [point.x - 65, point.y - 43, 7],
        [point.x, point.y, 0]
      ];
      const animation = bird.animate(route.map(([x, y, angle]) => ({
        transform: `translate(${x - point.x}px, ${y - point.y}px) rotate(${angle}deg)`
      })), { duration: 7200 + index * 650, delay: 1000 + index * 1150, easing: 'ease-in-out', fill: 'both' });
      flights.set(bird, animation);
      animation.onfinish = () => {
        bird.classList.add('is-landed');
        flights.delete(bird);
        animation.cancel();
      };
    });
  }
  function finalScene() {
    phaseVersion++;
    guests?.classList.add('is-visible');
    couple?.classList.add('is-visible');
    ceremonyComplete = true;
    positions();
    place(false);
  }
  async function start() {
    if (started) return;
    started = true;
    const version = ++phaseVersion;
    ceremonyComplete = false;
    const birdImages = birds.flatMap(bird => Array.from(bird.querySelectorAll('img')));
    const sceneImages = Array.from(document.querySelectorAll('[data-ceremony-image]')).map(node => {
      const image = new Image();
      image.src = node.getAttribute('href');
      return image;
    });
    await Promise.allSettled([...birdImages, ...sceneImages].map(image => image.decode ? image.decode() : Promise.resolve()));
    if (version !== phaseVersion) return;
    positions();
    if (motion.matches) { finalScene(); return; }
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    // 1. Empty chairs and chapel, then 2. guests and officiant.
    await wait(1500);
    if (version !== phaseVersion) return;
    guests?.classList.add('is-visible');
    await wait(3300);
    if (version !== phaseVersion) return;
    // 3. The couple appears before 4. the birds begin their flight.
    couple?.classList.add('is-visible');
    await wait(2900);
    if (version !== phaseVersion) return;
    ceremonyComplete = true;
    place(true);
  }
  if (artwork.complete && artwork.naturalWidth) requestAnimationFrame(start);
  else artwork.addEventListener('load', start, { once: true });
  replay?.addEventListener('click', () => {
    phaseVersion++;
    flights.forEach(animation => animation.cancel());
    flights.clear();
    birds.forEach(bird => { bird.style.opacity = '0'; bird.classList.remove('is-landed'); });
    cover.classList.add('ceremony-resetting');
    guests?.classList.remove('is-visible');
    couple?.classList.remove('is-visible');
    if (guests) getComputedStyle(guests).opacity;
    started = false;
    requestAnimationFrame(() => { cover.classList.remove('ceremony-resetting'); start(); });
  });
  // Keep the people, animated pines and roof perches aligned with the cover crop.
  window.addEventListener('resize', () => {
    if (!started) return;
    positions();
    if (ceremonyComplete) place(false);
  }, { passive: true });
  motion.addEventListener('change', () => { if (started && motion.matches) finalScene(); });

})();

// Movimiento continuo y control explícito para la escena de Salduero.
(() => {
  const scenes = Array.from(document.querySelectorAll('.living-scene'));
  const sunday = document.querySelector('.living-salduero .living-scene');
  const toggle = document.getElementById('salduero-motion-toggle');
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let sundayOverride = null;
  function syncMotion() {
    scenes.forEach(scene => {
      const enabled = scene === sunday && sundayOverride !== null ? sundayOverride : !preference.matches;
      if (!enabled || document.hidden) scene.pauseAnimations?.();
      else scene.unpauseAnimations?.();
      if (scene === sunday && toggle) {
        toggle.textContent = enabled ? 'Pausar animación' : 'Activar animación';
        toggle.setAttribute('aria-label', enabled ? 'Pausar animación de Salduero' : 'Activar animación de Salduero');
      }
    });
  }
  toggle?.addEventListener('click', () => {
    const currentlyEnabled = sundayOverride !== null ? sundayOverride : !preference.matches;
    sundayOverride = !currentlyEnabled;
    syncMotion();
  });
  preference.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  syncMotion();
})();
