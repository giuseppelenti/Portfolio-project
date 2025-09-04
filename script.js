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
    const scroller = detail.querySelector('.project-detail-scroller');
    const slides = Array.from(scroller.querySelectorAll('.detail-slide'));

    // Open overlay for a given topic name
    const openDetail = (topic) => {
        // Set title
        titleEl.textContent = topic || 'Project';
        // Show modal
        detail.classList.add('open');
        detail.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        // Jump to corresponding slide
        const idx = slides.findIndex(sl => (sl.getAttribute('data-topic')||'').toLowerCase() === (topic||'').toLowerCase());
        const target = idx >= 0 ? slides[idx] : slides[0];
        if (target) {
            target.scrollIntoView({ behavior: 'instant', inline: 'start', block: 'nearest' });
            // Align exactly
            scroller.scrollLeft = target.offsetLeft;
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
        document.body.classList.remove('modal-open');
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

    // Drag-to-scroll for detail scroller
    if (scroller) {
        let isDown = false;
        let startX = 0;
        let scrollStart = 0;
        let activePointerId = null;

        const onDown = (clientX) => {
            isDown = true;
            scroller.classList.add('dragging');
            startX = clientX;
            scrollStart = scroller.scrollLeft;
        };
        const onMove = (clientX, e) => {
            if (!isDown) return;
            if (e && e.cancelable) e.preventDefault();
            const dx = clientX - startX;
            scroller.scrollLeft = scrollStart - dx;
        };
        const onUp = () => {
            if (!isDown) return;
            isDown = false;
            scroller.classList.remove('dragging');
        };

        scroller.addEventListener('pointerdown', (e) => {
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            if (e && e.cancelable) e.preventDefault();
            activePointerId = e.pointerId;
            scroller.setPointerCapture(activePointerId);
            onDown(e.clientX);
        });
        scroller.addEventListener('pointermove', (e) => {
            if (activePointerId === null || e.pointerId !== activePointerId) return;
            onMove(e.clientX, e);
        });
        const endPtr = (e) => {
            if (activePointerId === null || e.pointerId !== activePointerId) return;
            try { scroller.releasePointerCapture(activePointerId); } catch(_) {}
            activePointerId = null;
            onUp();
        };
        scroller.addEventListener('pointerup', endPtr);
        scroller.addEventListener('pointercancel', endPtr);
        scroller.addEventListener('lostpointercapture', () => { activePointerId = null; onUp(); });
        scroller.addEventListener('pointerleave', (e) => { if (e.pointerId === activePointerId) { activePointerId = null; onUp(); } });
        scroller.addEventListener('dragstart', (e) => e.preventDefault());

        // Wheel: map vertical wheel to horizontal scroll for wide slides
        scroller.addEventListener('wheel', (e) => {
            // Combine deltas: prefer vertical for typical mouse wheels; trackpads may provide deltaX
            const horizontalDelta = Math.abs(e.deltaY) >= Math.abs(e.deltaX)
                ? e.deltaY
                : e.deltaX;

            // Apply a mild factor for smoother feel across devices
            const factor = e.shiftKey ? 1.0 : 1.0; // keep 1:1; adjust if needed
            scroller.scrollLeft += horizontalDelta * factor;

            // Prevent page from attempting to scroll vertically while inside overlay
            if (e.cancelable) e.preventDefault();
        }, { passive: false });
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
        hamburgerMenu.addEventListener('click', function() {
            mainNav.classList.toggle('open');
            hamburgerMenu.classList.toggle('open'); // Trasformazione icona
            updateHamburgerVisibility();
        });
        hamburgerMenu.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                mainNav.classList.toggle('open');
                hamburgerMenu.classList.toggle('open');
                updateHamburgerVisibility();
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!mainNav.contains(e.target) && !hamburgerMenu.contains(e.target)) {
                mainNav.classList.remove('open');
                hamburgerMenu.classList.remove('open');
                updateHamburgerVisibility();
            }
        });

        // Close menu when a navigation item is clicked
        document.querySelectorAll('.nav-item').forEach(link => {
            link.addEventListener('click', () => {
                mainNav.classList.remove('open');
                hamburgerMenu.classList.remove('open');
                updateHamburgerVisibility();
            });
        });
    }

    // Dynamic contrast for hamburger based on background (detect .is-dark under the button)
    const updateHamburgerContrast = () => {
        if (!hamburgerMenu) return;
        const rect = hamburgerMenu.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const elements = document.elementsFromPoint(x, y);
        const isOverDark = elements.some(el =>
            el && el.classList && (el.classList.contains('is-dark') || (el.closest && el.closest('.is-dark')))
        );
        hamburgerMenu.classList.toggle('on-dark', isOverDark);
        hamburgerMenu.classList.toggle('on-light', !isOverDark);
    };

    // Run on load and keep updating on scroll/resize on all pages
    updateHamburgerContrast();
    window.addEventListener('scroll', updateHamburgerContrast, { passive: true });
    window.addEventListener('resize', updateHamburgerContrast);

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
        let scrollStart = 0;
        let reboundRaf = 0;
        let prevTouchAction = '';
        let dragDelta = 0; // track movement to detect taps

        const maxScroll = () => Math.max(0, projectsScroller.scrollWidth - projectsScroller.clientWidth);
        // Elastic resistance using tanh for smoothness
        const resist = (excess) => {
            const k = 100; // resistance radius in px
            return k * Math.tanh(excess / k);
        };

        const onDown = (clientX) => {
            isDown = true;
            projectsScroller.classList.add('dragging');
            startX = clientX;
            scrollStart = projectsScroller.scrollLeft;
            // During active drag, fully lock touch-action to avoid pointercancel
            prevTouchAction = projectsScroller.style.touchAction;
            projectsScroller.style.touchAction = 'none';
            dragDelta = 0;
        };

        const onMove = (clientX, e) => {
            if (!isDown) return;
            if (e && e.cancelable) e.preventDefault();
            const dx = clientX - startX;
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
                    } else {
                        reboundRaf = 0;
                        projectsScroller.scrollLeft = target;
                    }
                };
                if (reboundRaf) cancelAnimationFrame(reboundRaf);
                reboundRaf = requestAnimationFrame(step);
            }
        };

        // Pointer Events with capture for smooth, continuous dragging
        let activePointerId = null;
        projectsScroller.addEventListener('pointerdown', (e) => {
            // Ignore pointer interactions that originate on the download button
            if (e.target && e.target.closest && e.target.closest('.topic-download')) {
                return;
            }
            if (e.button !== 0 && e.pointerType === 'mouse') return; // left button only
            // Do NOT preventDefault here, to preserve native click on child cards
            activePointerId = e.pointerId;
            projectsScroller.setPointerCapture(activePointerId);
            onDown(e.clientX);
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

    // Drag handlers (mouse + touch)
    const onDragStart = (clientX) => {
        cancelAnimationFrame(rafId);
        isDragging = true;
        dragStartX = clientX;
        dragStartPos = position;
        container.classList.add('dragging');
    };

    const onDragMove = (clientX) => {
        if (!isDragging) return;
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
        if (!isDragging) return;
        isDragging = false;
        container.classList.remove('dragging');
        // Snap to nearest slide with a small easing
        const index = getCurrentIndex();
        snapToIndex(index, true);
        rafId = requestAnimationFrame(loop);
    };

    // Mouse events
    container.addEventListener('mousedown', (e) => {
        e.preventDefault();
        onDragStart(e.clientX);
    });
    window.addEventListener('mousemove', (e) => onDragMove(e.clientX));
    window.addEventListener('mouseup', onDragEnd);

    // Touch events
    container.addEventListener('touchstart', (e) => {
        const t = e.touches[0];
        onDragStart(t.clientX);
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
        const t = e.touches[0];
        onDragMove(t.clientX);
    }, { passive: true });
    window.addEventListener('touchend', onDragEnd);

    // Pause on hover (robust across devices/components)
    const setPaused = (v) => {
        isPaused = v;
        if (!v) {
            // If unpausing and loop somehow stalled, kick it
            if (!isLooping) {
                startLoopIfNeeded();
            }
        }
    };
    ['pointerenter'].forEach(evt => {
        container.addEventListener(evt, () => setPaused(true));
        track.addEventListener(evt, () => setPaused(true));
    });
    ['pointerleave'].forEach(evt => {
        container.addEventListener(evt, () => { setPaused(false); startLoopIfNeeded(); });
        track.addEventListener(evt, () => { setPaused(false); startLoopIfNeeded(); });
    });
    // Also pause when tab is unfocused, resume on focus
    window.addEventListener('blur', () => setPaused(true));
    window.addEventListener('focus', () => { setPaused(false); startLoopIfNeeded(); });

    // Fallback: hover polling in case some browsers/elements swallow pointerleave
    const hoverPoll = setInterval(() => {
        const hovered = container.matches(':hover');
        if (!hovered && isPaused) {
            setPaused(false);
        }
    }, 400);
    window.addEventListener('beforeunload', () => clearInterval(hoverPoll));

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