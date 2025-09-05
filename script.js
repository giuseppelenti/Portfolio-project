document.addEventListener('DOMContentLoaded', function() {
    const isAboutPage = /about\.html(?:$|\?|#)/i.test(location.pathname);
    // Dark mode toggle
    const toggleBtn = document.getElementById('darkModeToggle');
    const darkModeIcon = document.getElementById('darkModeIcon');
    toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        if(document.body.classList.contains('dark-mode')) {
            darkModeIcon.innerHTML = '<i class="fa fa-sun"></i>';
        } else {
            darkModeIcon.innerHTML = '<i class="fa fa-moon"></i>';
        }
    });

// Project Detail overlay logic
(function() {
    const detail = document.getElementById('project-detail');
    if (!detail) return;
    const closeBtn = detail.querySelector('.project-detail-close');
    const titleEl = detail.querySelector('.project-detail-title');
    let scroller = detail.querySelector('.project-detail-scroller');
    const getSlides = () => Array.from(scroller.querySelectorAll('.detail-slide'));

    // Open overlay for a given topic name
    const openDetail = (topic) => {
        // Set title
        titleEl.textContent = topic || 'Project';
        // Show modal
        detail.classList.add('open');
        detail.setAttribute('aria-hidden', 'false');
        // Body no longer needs modal-open; overlay manages its own interactions
        // Jump to corresponding slide
        const slidesNow = getSlides();
        const idx = slidesNow.findIndex(sl => (sl.getAttribute('data-topic')||'').toLowerCase() === (topic||'').toLowerCase());
        const target = idx >= 0 ? slidesNow[idx] : slidesNow[0];
        if (target) {
            const cs = window.getComputedStyle(scroller);
            const isVerticalDetail = cs.overflowX === 'hidden' && cs.overflowY !== 'hidden';
            if (isVerticalDetail) {
                // Vertical layout: align slide to top
                target.scrollIntoView({ behavior: 'instant', block: 'start', inline: 'nearest' });
                scroller.scrollTop = target.offsetTop;
                // Ensure the scroller captures wheel/keyboard focus
                scroller.style.overflowY = 'auto';
                scroller.style.overflowX = 'hidden';
                scroller.tabIndex = -1;
                try { scroller.focus({ preventScroll: true }); } catch(_) {}
                // Ensure media inside overlay do not block vertical scroll on touch
                ensureOverlayMediaScrollable();
            } else {
                // Horizontal layout (legacy): align to left
                target.scrollIntoView({ behavior: 'instant', inline: 'start', block: 'nearest' });
                scroller.scrollLeft = target.offsetLeft;
            }
        }
    };

    // Zoom-in animation from a project card into the overlay
    const animateOpenFromCard = (card, topic) => {
        const img = card.querySelector('.topic-image');
        const rect = (img || card).getBoundingClientRect();
        const ghost = document.createElement('div');
        ghost.className = 'project-zoom-ghost';
        const gimg = new Image();
        if (img && img.currentSrc) gimg.src = img.currentSrc; else if (img && img.src) gimg.src = img.src;
        ghost.appendChild(gimg);
        document.body.appendChild(ghost);
        // Compute initial transform from card rect to viewport (transform-origin: top left)
        const scaleX = Math.max(0.01, rect.width / window.innerWidth);
        const scaleY = Math.max(0.01, rect.height / window.innerHeight);
        const tx = Math.round(rect.left);
        const ty = Math.round(rect.top);
        ghost.style.transform = `translate(${tx}px, ${ty}px) scale(${scaleX}, ${scaleY})`;
        // Force reflow then animate to identity
        void ghost.offsetHeight;
        requestAnimationFrame(() => {
            ghost.style.transform = 'translate(0px, 0px) scale(1, 1)';
            ghost.style.borderRadius = '0px';
        });
        const end = () => {
            ghost.removeEventListener('transitionend', end);
            ghost.remove();
            openDetail(topic);
        };
        // Safety timeout in case transitionend doesn't fire
        const timer = setTimeout(() => { try { end(); } catch(_) {} }, 450);
        ghost.addEventListener('transitionend', () => { clearTimeout(timer); end(); }, { once: true });
    };

    const closeDetail = () => {
        detail.classList.remove('open');
        detail.setAttribute('aria-hidden', 'true');
        // No modal-open class to remove; keep body free for interactions
    };

    // Bind open handlers on project topic blocks
    document.querySelectorAll('.projects-scroller .project-topic-block').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            const topic = (card.querySelector('.topic-title')?.textContent || '').trim();
            animateOpenFromCard(card, topic);
        });
        // Enter key accessibility
        card.setAttribute('tabindex', '0');
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const topic = (card.querySelector('.topic-title')?.textContent || '').trim();
                animateOpenFromCard(card, topic);
            }
        });
    });

    // Prevent download button from triggering card open/drag
    document.querySelectorAll('.projects-scroller .project-topic-block .topic-download').forEach(btn => {
        // Stop click from bubbling to card
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            // allow default to proceed (download)
        });
        // Avoid starting drag from the button
        btn.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
        });
        // Prevent card key handler from activating when focused on the button
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
            }
        });
    });

    // Close interactions
    closeBtn?.addEventListener('click', closeDetail);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && detail.classList.contains('open')) closeDetail();
    });

    // Fallback listener for programmatic open from scroller tap-detection
    window.addEventListener('open-project-detail', (ev) => {
        try {
            const data = ev.detail || {};
            if (data.card && data.topic) {
                animateOpenFromCard(data.card, data.topic);
            } else if (data.topic) {
                openDetail(data.topic);
            }
        } catch (_) { /* no-op */ }
    });

    // Project detail is vertical-only now: no custom drag/wheel handlers needed.
    const ensureOverlayMediaScrollable = () => {
        try {
            const imgs = detail.querySelectorAll('.detail-slide img');
            imgs.forEach(img => {
                img.setAttribute('draggable', 'false');
                img.style.webkitUserDrag = 'none';
                img.style.userSelect = 'none';
                img.style.touchAction = 'pan-y';
            });
            const mediaContainers = detail.querySelectorAll('.detail-slide .split-right, .process-step .step-media');
            mediaContainers.forEach(el => { el.style.touchAction = 'pan-y'; });
        } catch (_) { /* no-op */ }
    };
    if (scroller) {
        const cs0 = window.getComputedStyle(scroller);
        const isVerticalDetail = cs0.overflowX === 'hidden' && cs0.overflowY !== 'hidden';
        if (isVerticalDetail) {
            const prevScrollTop = scroller.scrollTop;
            const clone = scroller.cloneNode(true);
            clone.style.cursor = 'auto';
            clone.style.touchAction = 'auto';
            clone.style.userSelect = 'auto';
            clone.style.overscrollBehavior = 'auto';
            scroller.parentNode.replaceChild(clone, scroller);
            scroller = clone;
            scroller.scrollTop = prevScrollTop;
            // Reinforce media touch behavior after DOM replacement
            ensureOverlayMediaScrollable();

            // Remove custom forwarding; rely on native scrolling for smoothness
        }
    }
})();

    // Scroll to top button
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    const threshold = 20; // show much earlier for short pages

    if (scrollTopBtn) {
        const toggleScrollTopButton = () => {
            if (window.scrollY > threshold) {
                scrollTopBtn.classList.add('visible');
            } else {
                scrollTopBtn.classList.remove('visible');
            }
        };

        // Enable on all pages
        toggleScrollTopButton();
        window.addEventListener('scroll', toggleScrollTopButton, { passive: true });

        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Force visible on load as a safety so you can see it immediately
        scrollTopBtn.classList.add('visible');
    }

    // moved tilt and magnetic hover below prefersReduced declaration
    // Navbar animazione lettere identica a index.html
    document.querySelectorAll('.nav-item').forEach(item => {
        const numberSpan = item.querySelector('.nav-number');
        let text = item.childNodes[item.childNodes.length - 1].textContent.trim();
        if (text) {
            item.childNodes[item.childNodes.length - 1].textContent = '';
            text.split('').forEach((char, i) => {
                const span = document.createElement('span');
                span.textContent = char;
                span.classList.add('nav-animated');
                span.style.animationDelay = `${i * 0.06}s`;
                item.appendChild(span);
            });
        }
    });

    // Hamburger menu toggle e trasformazione in "X" (solo se esiste #mainNav)
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const mainNav = document.getElementById('mainNav');
    const heroSection = document.querySelector('.hero-section');
    if (hamburgerMenu) {
        // A11y: ensure it's keyboard-focusable and acts like a button
        hamburgerMenu.setAttribute('role', 'button');
        hamburgerMenu.setAttribute('tabindex', '0');
        hamburgerMenu.setAttribute('aria-label', 'Toggle navigation');
        hamburgerMenu.setAttribute('aria-expanded', 'false');
    }
    // Control hamburger visibility: only show after exiting hero (or if open)
    const isPastHero = () => {
        if (!heroSection) return window.scrollY > 60;
        const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
        return window.scrollY >= heroBottom - 1; // small buffer
    };
    const updateHamburgerVisibility = () => {
        if (!hamburgerMenu) return;
        const forceVisible = hamburgerMenu.classList.contains('open');
        if (forceVisible || isPastHero()) {
            hamburgerMenu.classList.add('visible');
        } else {
            hamburgerMenu.classList.remove('visible');
        }
    };
    // init + listeners
    updateHamburgerVisibility();
    window.addEventListener('scroll', updateHamburgerVisibility, { passive: true });
    window.addEventListener('resize', updateHamburgerVisibility);

    if (hamburgerMenu && mainNav) {
        const toggleHamburger = () => {
            const isOpen = !hamburgerMenu.classList.contains('open');
            hamburgerMenu.classList.toggle('open', isOpen);
            mainNav.classList.toggle('open', isOpen);
            hamburgerMenu.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            // Debug: visual trace
            console.debug('[hamburger] toggled ->', { isOpen });
            updateHamburgerVisibility();
        };

        // Touch guard to avoid double toggle (touchstart + click)
        let touched = false;
        hamburgerMenu.addEventListener('touchstart', (e) => {
            touched = true;
            e.preventDefault();
            e.stopPropagation();
            toggleHamburger();
        }, { passive: false });

        hamburgerMenu.addEventListener('click', function(e) {
            if (touched) { touched = false; return; }
            toggleHamburger();
        });
        hamburgerMenu.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleHamburger();
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!mainNav.contains(e.target) && !hamburgerMenu.contains(e.target)) {
                mainNav.classList.remove('open');
                hamburgerMenu.classList.remove('open');
                updateHamburgerVisibility();
                hamburgerMenu.setAttribute('aria-expanded', 'false');
            }
        });

        // Close menu when a navigation item is clicked
        document.querySelectorAll('.nav-item').forEach(link => {
            link.addEventListener('click', () => {
                mainNav.classList.remove('open');
                hamburgerMenu.classList.remove('open');
                updateHamburgerVisibility();
                hamburgerMenu.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // Theme-only control for hamburger appearance; no dynamic contrast

    // Reveal on scroll limited to a curated set of classes (exclude carousel)
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rootContainer = document.querySelector('.main-content') || document.body;
    const INCLUDE_SELECTORS = [
        // generic
        '.reveal', 'section', '.section',
        // cards/blocks
        '.stat-item', '.project-card', '.feature-card', '.service-card', '.grid-item', '.card',
        // about page key elements
        '.about-section', '.about-caption', '.about-caption .giant-text', '.about-stats', '.about-stats .stat-item', '.about-text', '.about-hero',
        // footer sections
        'footer', '.footer', '.footer-cta', '.footer-headings', '.footer-cta-actions', '.footer-illustration'
    ];
    let revealTargets = Array.from(rootContainer.querySelectorAll(INCLUDE_SELECTORS.join(', ')))
        // Exclude only elements INSIDE the carousel (keep ancestors like about-section)
        .filter(el => !el.closest('.carousel-container'));
    // Ensure base state only on chosen targets
    revealTargets.forEach(el => el.classList.add('reveal'));

    // Ensure info columns participate in reveal-on-scroll
    const infoCols = Array.from(document.querySelectorAll('.info-column'));
    infoCols.forEach(el => el.classList.add('reveal'));
    // Also add them to the observed target list so they get 'is-visible'
    revealTargets = revealTargets.concat(infoCols);

    // Safety: if any carousel element accidentally has reveal/is-visible, remove to ensure visibility
    document.querySelectorAll('.carousel-container, .carousel-container *').forEach(el => {
        el.classList.remove('reveal');
        el.classList.remove('is-visible');
    });

    if (!prefersReduced && revealTargets.length) {
        const io = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const idx = revealTargets.indexOf(el);
                    // Stagger up to 450ms max
                    setTimeout(() => el.classList.add('is-visible'), Math.min(idx * 30, 450));
                    obs.unobserve(el);
                }
            });
        }, { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

        revealTargets.forEach(el => io.observe(el));
    } else {
        // Reduced motion or no targets: show immediately
        revealTargets.forEach(el => el.classList.add('is-visible'));
    }

    // ==============================
    // Tilt/Parallax for project cards + spotlight
    // Magnetic hover for footer CTA
    // (Respect reduced motion)
    // ==============================
    const initTiltParallax = () => {
        if (prefersReduced) return;
        const cards = document.querySelectorAll('.project-topic-block');
        const maxTilt = 8; // degrees
        const imgParallax = 1.06; // scale factor for subtle zoom
        cards.forEach(card => {
            const img = card.querySelector('.topic-image');
            // Precompute bounding rect on enter for performance
            let rect = null;
            const onEnter = () => { rect = card.getBoundingClientRect(); };
            const onMove = (e) => {
                if (!rect) rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const px = Math.max(0, Math.min(1, x / rect.width));
                const py = Math.max(0, Math.min(1, y / rect.height));
                // Spotlight position via CSS custom props (consumed by ::after)
                card.style.setProperty('--hx', `${(px * 100).toFixed(2)}%`);
                card.style.setProperty('--hy', `${(py * 100).toFixed(2)}%`);
                // Tilt around center
                const tiltX = (py - 0.5) * -2 * maxTilt;
                const tiltY = (px - 0.5) * 2 * maxTilt;
                card.style.transform = `perspective(800px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;
                if (img) {
                    // Parallax image slight translate opposite tilt + subtle scale
                    const tx = (0.5 - px) * 12;
                    const ty = (0.5 - py) * 12;
                    img.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${imgParallax})`;
                }
            };
            const onLeave = () => {
                card.style.transform = 'none';
                if (img) img.style.transform = 'none';
            };
            card.addEventListener('pointerenter', onEnter);
            card.addEventListener('pointermove', onMove);
            card.addEventListener('pointerleave', onLeave);
            card.addEventListener('pointercancel', onLeave);
        });
    };

    const initMagneticCTA = () => {
        if (prefersReduced) return;
        const cta = document.querySelector('.footer-cta-link');
        if (!cta) return;
        const strength = 14; // px translation max
        let rect = null;
        const onEnter = () => { rect = cta.getBoundingClientRect(); };
        const onMove = (e) => {
            if (!rect) rect = cta.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const px = Math.max(0, Math.min(1, x / rect.width));
            const py = Math.max(0, Math.min(1, y / rect.height));
            const tx = (px - 0.5) * strength;
            const ty = (py - 0.5) * strength;
            cta.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px)`;
        };
        const onLeave = () => {
            cta.style.transform = 'translate(0, 0)';
        };
        cta.addEventListener('pointerenter', onEnter);
        cta.addEventListener('pointermove', onMove);
        cta.addEventListener('pointerleave', onLeave);
        cta.addEventListener('pointercancel', onLeave);
    };

    // Initialize interactions
    initTiltParallax();
    initMagneticCTA();

    // About stats: count-up animation when visible
    const statNodes = Array.from(document.querySelectorAll('.about-stats .stat-value'));
    if (statNodes.length) {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const formatValue = (el, value) => {
            const prefix = el.getAttribute('data-prefix') || '';
            const suffix = el.getAttribute('data-suffix') || '';
            el.textContent = `${prefix}${value}${suffix}`;
        };

        const animateCount = (el) => {
            if (el.dataset.counted === 'true') return; // guard
            el.dataset.counted = 'true';
            const target = parseInt(el.getAttribute('data-target'), 10) || 0;
            const duration = 1200; // ms
            const start = 0;
            const startTime = performance.now();
            const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

            const step = (now) => {
                const elapsed = now - startTime;
                const t = Math.min(1, elapsed / duration);
                const eased = easeOutCubic(t);
                const current = Math.round(start + (target - start) * eased);
                formatValue(el, current);
                if (t < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        };

        if (prefersReducedMotion) {
            // Set instantly
            statNodes.forEach(el => {
                const target = parseInt(el.getAttribute('data-target'), 10) || 0;
                el.dataset.counted = 'true';
                formatValue(el, target);
            });
        } else {
            const statsObserver = new IntersectionObserver((entries, obs) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const el = entry.target.querySelector('.stat-value');
                        if (el) animateCount(el);
                        obs.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.3 });

            // Observe each card for independent triggering
            document.querySelectorAll('.about-stats .stat-item').forEach(card => statsObserver.observe(card));
        }
    }
    
    // Projects scroller: hold-and-drag horizontal scroll (no wheel/trackpad, no inertia)
    const projectsScroller = document.querySelector('.projects-scroller');
    if (projectsScroller) {
        let isDown = false;
        let startX = 0;
        let startY = 0;
        let scrollStart = 0;
        let reboundRaf = 0;
        let prevTouchAction = '';
        let dragDelta = 0; // track movement to detect taps
        let draggingHoriz = false; // direction lock
        let activePointerId = null; // pointer capture id

        const maxScroll = () => Math.max(0, projectsScroller.scrollWidth - projectsScroller.clientWidth);
        // Elastic resistance using tanh for smoothness
        const resist = (excess) => {
            const k = 100; // resistance radius in px
            return k * Math.tanh(excess / k);
        };

        const onDown = (clientX, clientY) => {
            isDown = true;
            projectsScroller.classList.add('dragging');
            startX = clientX;
            startY = clientY ?? startY;
            scrollStart = projectsScroller.scrollLeft;
            // During active drag, fully lock touch-action to avoid pointercancel
            prevTouchAction = projectsScroller.style.touchAction;
            // Do not lock yet; wait for clear horizontal intent
            draggingHoriz = false;
            dragDelta = 0;
            // Pause autoplay while touching
            isPaused = true;
        };

        const onMove = (clientX, e) => {
            if (!isDown) return;
            const dx = clientX - startX;
            const dy = (e && typeof e.clientY === 'number') ? (e.clientY - startY) : 0;
            if (!draggingHoriz) {
                // Lock to horizontal only if movement is mostly horizontal beyond threshold
                if (Math.abs(dx) > Math.max(12, Math.abs(dy))) {
                    draggingHoriz = true;
                    projectsScroller.style.touchAction = 'none';
                } else {
                    // Allow vertical scroll; do not prevent default
                    return;
                }
            }
            if (e && e.cancelable) e.preventDefault();
            dragDelta += Math.abs(dx);
            const raw = scrollStart - dx;
            const max = maxScroll();
            let next = raw;
            if (raw < 0) {
                // pull with resistance beyond left edge
                next = -resist(-raw);
            } else if (raw > max) {
                // pull with resistance beyond right edge
                next = max + resist(raw - max);
            }
            projectsScroller.scrollLeft = next; // immediate follow with edge resistance
        };

        const onUp = () => {
            if (!isDown) return;
            isDown = false;
            projectsScroller.classList.remove('dragging');
            // Restore touch-action after drag completes
            projectsScroller.style.touchAction = prevTouchAction || 'pan-y';
            draggingHoriz = false;
            // If outside bounds, animate back to nearest bound
            const max = maxScroll();
            const cur = projectsScroller.scrollLeft;
            let target = cur;
            if (cur < 0) target = 0;
            else if (cur > max) target = max;

            if (target !== cur) {
                const start = cur;
                const duration = 300; // ms
                const t0 = performance.now();
                const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
                const step = (now) => {
                    const t = Math.min(1, (now - t0) / duration);
                    const v = start + (target - start) * easeOutCubic(t);
                    projectsScroller.scrollLeft = v;
                    if (t < 1) {
                        reboundRaf = requestAnimationFrame(step);
                    }
                };
                if (reboundRaf) cancelAnimationFrame(reboundRaf);
                reboundRaf = requestAnimationFrame(step);
            }
        };
        // Pointer listeners
        projectsScroller.addEventListener('pointerdown', (e) => {
            // Ignore pointer interactions that originate on the download button
            if (e.target && e.target.closest && e.target.closest('.topic-download')) {
                return;
            }
            if (e.button !== 0 && e.pointerType === 'mouse') return; // left button only
            // Do NOT preventDefault here, to preserve native click on child cards
            activePointerId = e.pointerId;
            try { projectsScroller.setPointerCapture(activePointerId); } catch(_) {}
            onDown(e.clientX, e.clientY);
        });
        projectsScroller.addEventListener('pointermove', (e) => {
            if (activePointerId === null || e.pointerId !== activePointerId) return;
            onMove(e.clientX, e);
        });
        const endPointer = (e) => {
            if (activePointerId === null || e.pointerId !== activePointerId) return;
            try { projectsScroller.releasePointerCapture(activePointerId); } catch(_) {}
            activePointerId = null;
            onUp();
            // If it was effectively a tap (no meaningful drag), open the card under pointer
            if (dragDelta < 6) {
                const x = e.clientX, y = e.clientY;
                const els = document.elementsFromPoint(x, y);
                let card = null;
                for (const el of els) {
                    const c = el.closest?.('.project-topic-block');
                    if (c) { card = c; break; }
                }
                if (card) {
                    const topic = (card.querySelector('.topic-title')?.textContent || '').trim();
                    // Reuse existing animation logic
                    const img = card.querySelector('.topic-image');
                    const rect = (img || card).getBoundingClientRect();
                    // Guard: if rect is off-screen, fallback to direct open
                    if (rect.width === 0 || rect.height === 0) {
                        // fallback if not measurable
                        const detail = document.getElementById('project-detail');
                        if (detail) {
                            // openDetail is in closure above; simulate via event to avoid scope issues
                            const evt = new CustomEvent('open-project-detail', { detail: { topic, card } });
                            window.dispatchEvent(evt);
                        }
                    } else {
                        // Use existing helper via a hidden click on the card (will trigger the bound listener)
                        const clickEvt = new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y });
                        card.dispatchEvent(clickEvt);
                    }
                }
            }
        };
        projectsScroller.addEventListener('pointerup', endPointer);
        projectsScroller.addEventListener('pointercancel', endPointer);
        // Fallbacks in case some browsers drop capture unexpectedly
        projectsScroller.addEventListener('lostpointercapture', () => {
            activePointerId = null;
            onUp();
        });
        projectsScroller.addEventListener('pointerleave', (e) => {
            if (activePointerId !== null && e.pointerId === activePointerId) {
                activePointerId = null;
                onUp();
            }
        });

        // Prevent native dragstart (images) from interrupting pointer drag
        projectsScroller.addEventListener('dragstart', (e) => e.preventDefault());
        // Also mark images as non-draggable for robustness
        projectsScroller.querySelectorAll('img').forEach(img => { img.setAttribute('draggable', 'false'); });

        // Only block horizontal wheel gestures; allow vertical to scroll the page
        projectsScroller.addEventListener('wheel', (e) => {
            const isHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;
            if (isHorizontal) {
                // Requirement: disable wheel/trackpad horizontal scrolling for the scroller
                e.preventDefault();
            } // else: let vertical wheel bubble to page
        }, { passive: false });
    }
});

// Sticky/parallax/IO observers removed per request: no movement or fades on sections

window.addEventListener('load', () => {
    const isAboutPage = /about\.html(?:$|\?|#)/i.test(location.pathname);
    const track = document.querySelector('.carousel-track');
    const container = document.querySelector('.carousel-container');
    if (!track || !container) return;

    let originalSlides = Array.from(track.children);
    if (originalSlides.length === 0) return;

    // Ensure flex row layout
    track.style.display = 'flex';
    track.style.willChange = 'transform';

    // Clone slides to both ends for infinite loop
    const prependFrag = document.createDocumentFragment();
    const appendFrag = document.createDocumentFragment();
    originalSlides.forEach(slide => appendFrag.appendChild(slide.cloneNode(true)));
    // Prepend in reverse to keep order
    [...originalSlides].reverse().forEach(slide => prependFrag.insertBefore(slide.cloneNode(true), prependFrag.firstChild));
    track.insertBefore(prependFrag, track.firstChild);
    track.appendChild(appendFrag);

    // After cloning, refresh references
    const allSlides = Array.from(track.children);
    const originalCount = originalSlides.length;

    let slideWidth = 0;
    let position = 0; // pixel offset
    // Autoplay enabled for continuous scrolling
    const enableAutoplay = true;
    let speed = 1.8; // px per frame (faster)
    let rafId = null;
    let isLooping = false;
    // Drag state
    let isDragging = false;
    let isTouching = false; // true between touchstart and touchend; becomes dragging only if we lock to X
    // Hover pause state
    let isPaused = false;
    let dragStartX = 0;
    let dragStartPos = 0;

    const setSizes = () => {
        slideWidth = container.getBoundingClientRect().width;
        if (!slideWidth || isNaN(slideWidth)) {
            // Retry after layout settles
            setTimeout(() => {
                slideWidth = container.getBoundingClientRect().width;
                if (!slideWidth || isNaN(slideWidth)) return; // will retry on next resize/load
                allSlides.forEach(slide => {
            slide.style.minWidth = `${slideWidth}px`;
            slide.style.flex = `0 0 ${slideWidth}px`;
            slide.style.width = `${slideWidth}px`;
        });
                position = slideWidth * originalCount;
                track.style.transform = `translateX(-${position}px)`;
                console.debug('[carousel] retry setSizes -> width:', slideWidth);
            }, 50);
            return;
        }
        allSlides.forEach(slide => {
            slide.style.minWidth = `${slideWidth}px`;
            slide.style.flex = `0 0 ${slideWidth}px`;
            slide.style.width = `${slideWidth}px`;
        });
        // Start from the beginning (index 0) for guaranteed visibility
        position = 0;
        track.style.transform = `translateX(-${position}px)`;
        const crect = container.getBoundingClientRect();
        const trect = track.getBoundingClientRect();
        console.debug('[carousel] setSizes width:', slideWidth, 'container:', crect.width, crect.height, 'track:', trect.width, trect.height, 'slides:', allSlides.length);
    };

    const getCurrentIndex = () => {
        // Normalize position within the original set and compute index (0..originalCount-1)
        const approxIndex = Math.round(position / slideWidth);
        const wrapped = ((approxIndex % originalCount) + originalCount) % originalCount;
        return wrapped;
    };

    const loop = () => {
        isLooping = true;
        if (!isDragging && !isPaused) {
            position += speed;
        }
        const cycle = slideWidth * originalCount;
        if (position >= cycle) {
            position -= cycle;
        } else if (position < 0) {
            // In case of negative drift (e.g., drag), wrap forward
            position += cycle;
        }
        track.style.transform = `translateX(-${position}px)`;
        rafId = requestAnimationFrame(loop);
    };

    const startLoopIfNeeded = () => {
        if (!enableAutoplay) return;
        if (!isLooping) {
            rafId = requestAnimationFrame(loop);
        }
    };

    // Align to a specific slide, with optional smooth animation
    const snapToIndex = (index, animate = true) => {
        // Snap relative to the start (no middle offset)
        position = slideWidth * index;
        if (animate) {
            track.style.transition = 'transform 280ms ease';
            track.style.transform = `translateX(-${position}px)`;
            const clear = () => {
                track.style.transition = '';
                track.removeEventListener('transitionend', clear);
            };
            track.addEventListener('transitionend', clear);
        } else {
            track.style.transform = `translateX(-${position}px)`;
        }
    };

    // Drag handlers (mouse + touch) with gesture direction lock
    let dragStartY = 0;
    let gestureLocked = false; // becomes true when we decide horizontal vs vertical
    let lockDirection = null;  // 'x' for horizontal, 'y' for vertical

    const onDragStart = (clientX, clientY = 0) => {
        // Do not declare dragging yet; wait for a clear horizontal intent
        cancelAnimationFrame(rafId);
        isTouching = true;
        dragStartX = clientX;
        dragStartY = clientY;
        dragStartPos = position;
        gestureLocked = false;
        lockDirection = null;
    };

    const onDragMove = (clientX, clientY = 0, e = null) => {
        // Allow movement handling while touching (pre-drag) so we can lock direction
        if (!isDragging && !isTouching) return;
        // Determine gesture direction once the movement exceeds threshold
        if (!gestureLocked && clientY !== 0) {
            const dx = Math.abs(clientX - dragStartX);
            const dy = Math.abs(clientY - dragStartY);
            // Bias toward vertical but engage horizontal a bit sooner to avoid stutter
            const horizThreshold = 8; // px (was 12)
            const vertBias = 4;        // px (was 8)
            if (dx > horizThreshold && dx > dy + vertBias) {
                lockDirection = 'x';
                gestureLocked = true;
                // Begin horizontal drag only now
                isDragging = true;
                isPaused = true; // pause autoplay while dragging
                container.classList.add('dragging');
            } else if (dy > horizThreshold && dy >= dx) {
                lockDirection = 'y';
                gestureLocked = true;
            } else {
                // not enough info yet; do not prevent default
                return;
            }
        }
        if (gestureLocked && lockDirection === 'y') {
            // Let the page scroll vertically; do not handle as carousel drag
            return;
        }
        if (!isDragging) return; // guard
        // We are handling horizontal drag; prevent page scroll on touch devices
        if (e && e.cancelable) e.preventDefault();
        const delta = clientX - dragStartX; // dragging right -> positive delta
        // Follow the pointer like grabbing the photo
        position = dragStartPos - delta;
        const cycle = slideWidth * originalCount;
        // Keep position within reasonable range by wrapping
        if (position < 0) position += cycle;
        if (position >= slideWidth * (originalCount * 2)) position -= cycle;
        track.style.transform = `translateX(-${position}px)`;
    };

    const onDragEnd = () => {
        if (isDragging) {
            isDragging = false;
            container.classList.remove('dragging');
            // Snap to nearest slide with a small easing
            const index = getCurrentIndex();
            snapToIndex(index, true);
            // Resume autoplay shortly after to avoid immediate conflict
            setTimeout(() => { isPaused = false; startLoopIfNeeded(); }, 120);
        }
        // Restore vertical panning after touch ends
        try { container.style.touchAction = 'pan-y'; } catch (_) {}
        isTouching = false;
    };

    // Mouse events
    container.addEventListener('mousedown', (e) => {
        e.preventDefault();
        onDragStart(e.clientX, e.clientY);
        // For mouse, begin dragging immediately and lock to horizontal
        isDragging = true;
        isPaused = true;
        gestureLocked = true;
        lockDirection = 'x';
        container.classList.add('dragging');
    });
    window.addEventListener('mousemove', (e) => onDragMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onDragEnd);

    // Touch events: make touchmove non-passive so we can preventDefault when dragging horizontally
    // Default to allow vertical panning over the carousel via touch-action: pan-y
    try { container.style.touchAction = 'pan-y'; } catch (_) {}
    container.addEventListener('touchstart', (e) => {
        const t = e.touches[0];
        // Pause autoplay immediately on touch to avoid subtle horizontal motion during vertical scroll
        isPaused = true;
        onDragStart(t.clientX, t.clientY);
    }, { passive: true });
    container.addEventListener('touchmove', (e) => {
        const t = e.touches[0];
        onDragMove(t.clientX, t.clientY, e);
    }, { passive: false });
    window.addEventListener('touchend', () => {
        onDragEnd();
        // Resume autoplay a moment after touch ends if not dragging
        setTimeout(() => { if (!isDragging) { isPaused = false; startLoopIfNeeded(); } }, 180);
    }, { passive: true });

    // Pause on hover (desktop only)
    const setPaused = (v) => {
        isPaused = v;
        if (!v) {
            // If unpausing and loop somehow stalled, kick it
            if (!isLooping) {
                startLoopIfNeeded();
            }
        }
    };
    const supportsHover = (() => {
        try { return window.matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (_){ return false; }
    })();
    if (supportsHover) {
        ['pointerenter'].forEach(evt => {
            container.addEventListener(evt, () => setPaused(true));
            track.addEventListener(evt, () => setPaused(true));
        });
        ['pointerleave'].forEach(evt => {
            container.addEventListener(evt, () => { setPaused(false); startLoopIfNeeded(); });
            track.addEventListener(evt, () => { setPaused(false); startLoopIfNeeded(); });
        });
    }
    // Also pause when tab is unfocused, resume on focus (applies universally)
    window.addEventListener('blur', () => setPaused(true));
    window.addEventListener('focus', () => { setPaused(false); startLoopIfNeeded(); });

    // Fallback: hover polling only when hover is supported
    if (supportsHover) {
        const hoverPoll = setInterval(() => {
            const hovered = container.matches(':hover');
            if (!hovered && isPaused) {
                setPaused(false);
            }
        }, 400);
        window.addEventListener('beforeunload', () => clearInterval(hoverPoll));
    }

    // Hook image load to reflow once at least one is loaded
    const imgs = track.querySelectorAll('img');
    imgs.forEach(img => {
        if (img.complete) return; // already loaded
        img.addEventListener('load', () => {
            // After first image load, ensure sizes and snap
            setSizes();
            setTimeout(() => { if (slideWidth) snapToIndex(0, false); }, 30);
        }, { once: true });
        img.addEventListener('error', () => {
            console.warn('[carousel] image failed to load:', img.src);
        }, { once: true });
    });

    // Init
    setSizes();
    // Ensure a visible starting frame deterministically
    // Snap to first logical slide without animation after sizes are set
    setTimeout(() => {
        if (slideWidth && !isNaN(slideWidth)) {
            snapToIndex(0, false);
            // Kick the loop right after ensuring the first frame is visible
            cancelAnimationFrame(rafId);
            isLooping = false;
            startLoopIfNeeded();
        }
    }, 80);
    window.addEventListener('resize', () => {
        cancelAnimationFrame(rafId);
        isLooping = false;
        setSizes();
        startLoopIfNeeded();
    });
    startLoopIfNeeded();
});