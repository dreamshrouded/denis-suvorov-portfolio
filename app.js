const root = document.documentElement;
const themeToggle = document.querySelector('.theme-toggle');
const themeLabel = document.querySelector('.theme-label');
const themeStatus = document.querySelector('#theme-status');
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme(theme, announce = false) {
  root.dataset.theme = theme;
  const dark = theme === 'dark';
  const label = dark ? 'Включить светлую тему' : 'Включить тёмную тему';
  themeToggle.setAttribute('aria-label', label);
  themeToggle.setAttribute('title', label);
  themeToggle.setAttribute('aria-pressed', String(dark));
  themeLabel.textContent = dark ? 'Светлая' : 'Тёмная';
  document.querySelector('meta[name="theme-color"]').content = dark ? '#141e25' : '#e9eff2';
  if (announce) themeStatus.textContent = dark ? 'Тёмная тема включена' : 'Светлая тема включена';
}
applyTheme(root.dataset.theme);
themeToggle.addEventListener('click', () => {
  const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('portfolio-theme', theme); } catch (_) {}
  applyTheme(theme, true);
});
systemTheme.addEventListener('change', event => {
  let saved;
  try { saved = localStorage.getItem('portfolio-theme'); } catch (_) {}
  if (saved !== 'light' && saved !== 'dark') applyTheme(event.matches ? 'dark' : 'light');
});
const dialog = document.querySelector('#contact-dialog');
let contactTrigger;
document.querySelectorAll('.contact-open').forEach(button => button.addEventListener('click', () => {
  contactTrigger = button;
  dialog.showModal();
  document.body.classList.add('modal-open');
}));
document.querySelector('.close-button').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  contactTrigger?.focus({preventScroll: true});
});

const floatingTop = document.querySelector('.floating-top-button');
let footerVisible = false;
function updateBackToTop() {
  floatingTop.hidden = window.scrollY <= Math.max(600, window.innerHeight) || footerVisible;
}
window.addEventListener('scroll', updateBackToTop, { passive: true });
window.addEventListener('resize', updateBackToTop);
const footerObserver = new IntersectionObserver(entries => {
  footerVisible = entries[0].isIntersecting;
  updateBackToTop();
});
footerObserver.observe(document.querySelector('footer'));
updateBackToTop();

// Observe the resting layout; horizontal travel begins only when a block enters view.
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const revealElements = [...document.querySelectorAll('.key-results,.section-heading,.work-card,.expertise-item,.closing-card')];
const activeReveals = new Map();
let revealObserver;
function revealElement(element, animate = true) {
  revealObserver?.unobserve(element);
  activeReveals.get(element)?.cancel();
  activeReveals.delete(element);
  const wasPending = element.classList.contains('reveal-pending');
  element.classList.remove('reveal-pending');
  element.classList.add('reveal-shown');
  if (!wasPending || !animate || motionPreference.matches || !element.animate) return;
  const box = element.getBoundingClientRect();
  const fromLeft = element.dataset.revealSide === 'left';
  const distance = fromLeft ? -(box.right + 32) : window.innerWidth - box.left + 32;
  const delay = Number(element.dataset.revealDelay || 0);
  const animation = element.animate([
    {transform:`translate3d(${distance}px,0,0)`, opacity:0, offset:0},
    {opacity:1, offset:0.55},
    {transform:'translate3d(0,0,0)', opacity:1, offset:1}
  ], {duration:1080, delay, easing:'cubic-bezier(.16,1,.3,1)', fill:'backwards'});
  activeReveals.set(element, animation);
  const clear = () => { if (activeReveals.get(element) === animation) activeReveals.delete(element); };
  animation.finished.then(clear, clear);
}
function setupReveals() {
  revealObserver?.disconnect();
  activeReveals.forEach(animation => animation.cancel());
  activeReveals.clear();
  revealElements.forEach(element => element.classList.remove('reveal-pending'));
  if (motionPreference.matches || !('IntersectionObserver' in window)) {
    revealElements.forEach(element => element.classList.add('reveal-shown'));
    return;
  }
  const workCards = [...document.querySelectorAll('.work-card')];
  const expertiseItems = [...document.querySelectorAll('.expertise-item')];
  const closingCards = [...document.querySelectorAll('.closing-card')];
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) revealElement(entry.target); });
  }, {threshold:0, rootMargin:'0px 0px -64px 0px'});
  revealElements.forEach(element => {
    const box = element.getBoundingClientRect();
    let side = box.left + box.width / 2 <= window.innerWidth / 2 ? 'left' : 'right';
    let delay = 0;
    if (element.matches('.work-card')) side = workCards.indexOf(element) % 2 ? 'right' : 'left';
    else if (element.matches('.section-heading,.key-results')) side = 'left';
    else if (element.matches('.expertise-item')) {
      const index = expertiseItems.indexOf(element);
      side = index === 0 ? 'left' : 'right';
      delay = index * 65;
    } else if (element.matches('.closing-card')) {
      const index = closingCards.indexOf(element);
      side = index === 0 ? 'left' : 'right';
      delay = index * 65;
    }
    element.dataset.revealSide = side;
    element.dataset.revealDelay = String(delay);
    element.classList.add('reveal-element');
    if (!element.classList.contains('reveal-shown') && box.top >= window.innerHeight) {
      element.classList.add('reveal-pending');
      revealObserver.observe(element);
    }
  });
}
setupReveals();
motionPreference.addEventListener('change', setupReveals);
// Focused controls stay stationary and visible for keyboard navigation.
document.addEventListener('focusin', event => {
  const element = event.target.closest('.reveal-element');
  if (element) revealElement(element, false);
});

const isContentPreview = new URLSearchParams(window.location.search).get('preview') === '1' && window.parent !== window;
if (isContentPreview) {
  revealElements.forEach(element => revealElement(element, false));
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== window.location.origin || event.data?.type !== 'portfolio-preview') return;
    try { window.PortfolioContent.apply(event.data.content); if(['light','dark'].includes(event.data.theme))applyTheme(event.data.theme); } catch (_) {}
  });
  window.parent.postMessage({type:'portfolio-preview-ready'}, window.location.origin);
} else {
  fetch('content.json', {cache:'no-cache',signal:AbortSignal.timeout(10000)})
    .then(response => {if(!response.ok) throw new Error('Content unavailable'); return response.json();})
    .then(data => window.PortfolioContent.apply(data))
    .catch(() => { /* The complete original HTML remains readable if content cannot be fetched. */ });
}
