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

// Progressive reveal: only off-screen blocks are hidden, and only after JS is ready.
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const revealElements = [...document.querySelectorAll('.key-results,.section-heading,.work-card,.expertise-item,.closing-card')];
let revealObserver;
function setupReveals() {
  revealObserver?.disconnect();
  revealElements.forEach(element => element.classList.remove('reveal-pending'));
  if (motionPreference.matches || !('IntersectionObserver' in window)) return;
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('reveal-pending');
        entry.target.classList.add('reveal-shown');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {threshold:0, rootMargin:'0px 0px -36px 0px'});
  revealElements.forEach(element => {
    element.classList.add('reveal-element');
    if (!element.classList.contains('reveal-shown') && element.getBoundingClientRect().top >= window.innerHeight) {
      element.classList.add('reveal-pending'); revealObserver.observe(element);
    }
  });
}
setupReveals();
motionPreference.addEventListener('change', setupReveals);
// Keyboard focus must never land inside an invisible card.
document.addEventListener('focusin', event => event.target.closest('.reveal-pending')?.classList.remove('reveal-pending'));

const isContentPreview = new URLSearchParams(window.location.search).get('preview') === '1' && window.parent !== window;
if (isContentPreview) {
  document.querySelectorAll('.reveal-pending').forEach(element=>element.classList.remove('reveal-pending'));
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
