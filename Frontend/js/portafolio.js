/* ============================================================================
    Didier Imbachi — Portfolio script
    Vanilla JavaScript (ES2022+), cero dependencias.
    Cada módulo es una función chica llamada desde bootstrap() al final.
   ============================================================================ */

"use strict";
/* ---------------------------------------------------------- 1. THEME TOGGLE */
/* Persiste la preferencia del usuario en localStorage bajo "ml-theme".
   Default: usa valor guardado; si no hay, respeta el sistema operativo; fallback oscuro. */

function initThemeToggle() {
    const STORAGE_KEY = "ml-theme";
    const root = document.documentElement;
    const toggle = document.querySelector("[data-theme-toggle]");
    if (!toggle) return;

    const prefersLight = window.matchMedia("(prefers-color-scheme: light)");

    const getInitialTheme = () => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === "light" || saved === "dark") return saved;
        return prefersLight.matches ? "light" : "dark";
    };

    const applyTheme = (theme) => {
        root.setAttribute("data-theme", theme);
        toggle.setAttribute(
        "aria-label",
        theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"
        );
        // Mantener la barra del navegador mobile en sintonía
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", theme === "dark" ? "#0b0c0e" : "#fafaf7");
    };

    applyTheme(getInitialTheme());

    toggle.addEventListener("click", () => {
        const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        applyTheme(next);
        localStorage.setItem(STORAGE_KEY, next);
    });

    // Seguir cambios del OS sólo si el usuario no eligió explícitamente
    prefersLight.addEventListener("change", (e) => {
        if (!localStorage.getItem(STORAGE_KEY)) {
        applyTheme(e.matches ? "light" : "dark");
        }
    });
}

/* ---------------------------------------------------------- 2. NAV SCROLL STATE */
/* Agrega `.is-scrolled` al `.nav` después de que el usuario scrolleó más de 12px. */
function initNavScrollState() {
    const nav = document.querySelector("[data-nav]");
    if (!nav) return;

    const THRESHOLD = 12;
    let ticking = false;

    const update = () => {
        nav.classList.toggle("is-scrolled", window.scrollY > THRESHOLD);
        ticking = false;
    };

    window.addEventListener(
        "scroll",
        () => {
        if (!ticking) {
            window.requestAnimationFrame(update);
            ticking = true;
        }
        },
        { passive: true }
    );

    update();
}

/* ---------------------------------------------------------- 3. MOBILE MENU */
/* Toggle del hamburger. Cierra al click en un link, Escape, o viewport grande.
   Usa la clase body.menu-open para bloquear scroll. */
function initMobileMenu() {
    const toggle = document.querySelector("[data-menu-toggle]");
    const menu = document.querySelector("[data-mobile-menu]");
    if (!toggle || !menu) return;

    const setOpen = (open) => {
        toggle.setAttribute("aria-expanded", String(open));
        menu.hidden = !open;
        document.body.classList.toggle("menu-open", open);
        toggle.setAttribute("aria-label", open ? "Cerrar menu" : "Abrir menu");
    };

    toggle.addEventListener("click", () => {
        const isOpen = toggle.getAttribute("aria-expanded") === "true";
        setOpen(!isOpen);
    }); 

    // Cerrar al tocar un link del menú
    menu.addEventListener("click", (e) => {
        const target = e.target.closest("a");
        if (target) setOpen(false);
    });

    // Cerrar con Escape
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
        }
    });

    // Si el viewport crece por encima del breakpoint, resetear
    const mq = window.matchMedia("(min-width: 961px)");
    mq.addEventListener("change", (e) => {
        if (e.matches) setOpen(false);
    });
}

/* ---------------------------------------------------------- 4. REVEAL ON SCROLL */
/* IntersectionObserver para elementos con [data-reveal].
   Fallback: si IO no existe, los mostramos todos. */
function initReveal() {
    const targets = document.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window) || targets.length === 0) {
        targets.forEach((el) => el.classList.add("is-visible"));
        return;
    }

    const io = new IntersectionObserver(
        (entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
            }
        }
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );

    targets.forEach((el) => io.observe(el));
}

/* ---------------------------------------------------------- 5. SKILL BARS */
/* Mismo patrón que reveal, apuntado a .skills. La animación de ancho
   la maneja el CSS con `.skills.is-visible .skills__bar span { width: var(--w) }`. */
function initSkillBars() {
    const skills = document.querySelector(".skills");
    if (!skills || !("IntersectionObserver" in window)) {
        if (skills) skills.classList.add("is-visible");
        return;
    }

    const io = new IntersectionObserver(
        (entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
            }
        }
        },
        { threshold: 0.3 }
    );
    io.observe(skills);
}

/* ---------------------------------------------------------- 6. ACTIVE NAV LINK */
/* Resalta el link del menú cuya sección está actualmente visible. */
function initActiveNavLink() {
    const links = document.querySelectorAll(".nav__list a");
    const sections = Array.from(links)
        .map((a) => document.querySelector(a.getAttribute("href")))
        .filter(Boolean);
    if (sections.length === 0 || !("IntersectionObserver" in window)) return;

    const setActive = (id) => {
        links.forEach((a) => {
        const match = a.getAttribute("href") === `#${id}`;
        if (match) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
        });
    };

    const io = new IntersectionObserver(
        (entries) => {
        // Tomar la entrada más cercana al tope entre las que están visibles
        const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
        },
        { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );

    sections.forEach((s) => io.observe(s));
}

/* ---------------------------------------------------------- 7. COPY EMAIL */
/* Copia al portapapeles con async/await + fallback con document.execCommand.
   Feedback visual: toast temporal + label del botón. */
function initCopyEmail() {
    const btn = document.querySelector("[data-copy-email]");
    const toast = document.querySelector("[data-toast]");
    if (!btn) return;

    const label = btn.querySelector("[data-copy-label]");
    const originalText = label ? label.textContent : "Copiar email";
    let resetTimer = null;

    const showToast = (msg) => {
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add("is-visible");
        window.clearTimeout(showToast._t);
        showToast._t = window.setTimeout(
        () => toast.classList.remove("is-visible"),
        2200
        );
    };

    const fallbackCopy = (text) => {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try {
        document.execCommand("copy");
        return true;
        } catch {
        return false;
        } finally {
        document.body.removeChild(ta);
        }
    };

    btn.addEventListener("click", async () => {
        const email = btn.getAttribute("data-copy-email") || "";
        let ok = false;
        try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(email);
            ok = true;
        } else {
            ok = fallbackCopy(email);
        }
        } catch {
        ok = fallbackCopy(email);
        }

        if (ok) {
        showToast(`Copiado: ${email}`);
        if (label) label.textContent = "Copiado";
        window.clearTimeout(resetTimer);
        resetTimer = window.setTimeout(() => {
            if (label) label.textContent = originalText;
        }, 2000);
        } else {
        showToast("No se pudo copiar. Copialo manualmente :)");
        }
    });
}

/* ---------------------------------------------------------- 8. FOOTER YEAR */
/* Actualiza el año del footer al año actual. */
function initFooterYear() {
    const el = document.querySelector("[data-year]");
    if (el) el.textContent = String(new Date().getFullYear());
}



/* ---------------------------------------------------------- 9. BOOTSTRAP */
document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();
    initNavScrollState();
    initMobileMenu();
    initReveal();
    initSkillBars();
    initActiveNavLink();
    initCopyEmail();
    initFooterYear();
});




