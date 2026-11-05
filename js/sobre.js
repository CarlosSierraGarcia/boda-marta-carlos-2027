/* Debe cargarse en el head, antes del controlador de la escena. */
(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.add('invitation-pending');
  document.addEventListener('DOMContentLoaded', () => {
    const envelope = document.getElementById('invitation-envelope');
    const button = document.getElementById('open-invitation');
    const cta = document.getElementById('open-invitation-cta');
    const content = document.getElementById('invitation-content');
    if (!envelope || !button || !content) {
      root.classList.remove('invitation-pending');
      document.dispatchEvent(new Event('invitation-opened'));
      return;
    }
    content.inert = true;
    let opening = false;
    // La magia vive fuera de la portada para acompañar también su aparición.
    const releaseStardust = () => {
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (motion.matches) return;
      const canvas = document.createElement('canvas');
      canvas.className = 'invitation-stardust';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      if (!ctx) { canvas.remove(); return; }
      const width = window.innerWidth;
      const height = window.innerHeight;
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      ctx.scale(scale, scale);
      const rect = button.getBoundingClientRect();
      const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height * .57 };
      const stars = Array.from({ length: width < 600 ? 58 : 88 }, (_, i) => ({
        delay: 420 + Math.random() * 1400,
        duration: 2400 + Math.random() * 1300,
        spread: (Math.random() - .5) * width * 1.25,
        rise: height * (.45 + Math.random() * .6),
        curve: 40 + Math.random() * 110,
        size: 1.6 + Math.random() * 3.4,
        phase: Math.random() * Math.PI * 2,
        sparkle: i % 4 === 0,
        color: ['#b68b3d', '#d4ae62', '#f0d99e', '#a77d36'][i % 4]
      }));
      const position = (star, t) => ({
        x: origin.x + star.spread * t + Math.sin(t * Math.PI * 1.6) * star.curve,
        y: origin.y - star.rise * t + Math.sin(t * Math.PI * 2 + star.phase) * 15 * t
      });
      let frame;
      let stopped = false;
      const finish = () => {
        if (stopped) return;
        stopped = true;
        cancelAnimationFrame(frame);
        clearTimeout(failsafe);
        motion.removeEventListener('change', onMotionChange);
        window.removeEventListener('resize', finish);
        canvas.remove();
      };
      const onMotionChange = event => { if (event.matches) finish(); };
      const failsafe = setTimeout(finish, 6000);
      motion.addEventListener('change', onMotionChange);
      window.addEventListener('resize', finish, { once: true });
      const start = performance.now();
      const draw = now => {
        if (stopped) return;
        const elapsed = now - start;
        ctx.clearRect(0, 0, width, height);
        for (const star of stars) {
          const t = (elapsed - star.delay) / star.duration;
          if (t <= 0 || t >= 1) continue;
          const p = position(star, t);
          const tail = position(star, Math.max(0, t - .04));
          const opacity = Math.sin(Math.PI * t) * (.75 + .15 * Math.sin(t * 12 + star.phase));
          ctx.globalAlpha = opacity * .4;
          ctx.strokeStyle = star.color;
          ctx.lineWidth = .9;
          ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(p.x, p.y); ctx.stroke();
          ctx.globalAlpha = opacity;
          ctx.fillStyle = star.color;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(star.phase + t * .8);
          ctx.beginPath();
          if (star.sparkle) {
            for (let i = 0; i < 8; i++) {
              const angle = i * Math.PI / 4;
              const radius = star.size * (i % 2 ? .3 : 1.7);
              if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
              else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            }
            ctx.closePath();
          } else ctx.arc(0, 0, star.size * .5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
        if (elapsed < 5200) frame = requestAnimationFrame(draw);
        else finish();
      };
      frame = requestAnimationFrame(draw);
    };
    (cta || button).focus({ preventScroll: true });
    const openInvitation = async () => {
      if (opening) return;
      opening = true;
      button.setAttribute('aria-disabled', 'true');
      cta?.setAttribute('aria-disabled', 'true');
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      envelope.classList.add('is-opening');
      releaseStardust();
      if (!reduceMotion) await wait(1900);
      envelope.classList.add('is-leaving');
      if (!reduceMotion) await wait(750);
      // La portada conserva su estado inicial hasta que el sobre ha desaparecido.
      root.classList.remove('invitation-pending');
      content.inert = false;
      envelope.remove();
      // Sin salto al volver desde un ancla o al recargar a mitad de la página.
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      const title = document.querySelector('.landscape-invitation h1');
      if (title) {
        title.tabIndex = -1;
        title.focus({ preventScroll: true });
        title.addEventListener('blur', () => title.removeAttribute('tabindex'), { once: true });
      }
      document.dispatchEvent(new Event('invitation-opened'));
    };
    button.addEventListener('click', openInvitation);
    cta?.addEventListener('click', openInvitation);
  }, { once: true });
})();
