// ─── Boot Screen ─────────────────────────────────────────────────────────────
// O #boot-screen cobre tudo desde o primeiro frame (position:fixed, z-index 9999,
// background sólido, sem animation de entrada).
// Só exibe na primeira abertura da sessão; navegações internas removem
// o elemento imediatamente, antes de qualquer paint.

const screen  = document.getElementById('boot-screen');
const BOOT_KEY = 'motorpro_booted';

if (sessionStorage.getItem(BOOT_KEY) === '1') {
    // Navegação interna → remove antes de qualquer paint
    if (screen) screen.remove();
}

/**
 * Chame quando a página souber o que vai renderizar.
 * Faz fade-out do boot e remove o elemento.
 */
function bootDone() {
    if (!screen) return;
    sessionStorage.setItem(BOOT_KEY, '1');

    screen.classList.add('boot--out');

    const fallback = setTimeout(() => screen.remove(), 800);
    screen.addEventListener('transitionend', () => {
        clearTimeout(fallback);
        screen.remove();
    }, { once: true });
}

export { bootDone };
