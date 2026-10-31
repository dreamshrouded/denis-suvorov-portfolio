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
