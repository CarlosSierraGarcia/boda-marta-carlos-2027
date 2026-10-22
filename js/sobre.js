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
    (cta || button).focus({ preventScroll: true });
    const openInvitation = async () => {
      if (opening) return;
      opening = true;
      button.setAttribute('aria-disabled', 'true');
      cta?.setAttribute('aria-disabled', 'true');
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      envelope.classList.add('is-opening');
      if (!reduceMotion) await wait(1400);
      envelope.classList.add('is-leaving');
      if (!reduceMotion) await wait(600);
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
