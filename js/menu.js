jQuery(document).ready(function($) {
    // Seleziona gli elementi del menu
    const $hamburger = $('.hamburger-menu');
    const $nav = $('.main-nav');
    const $closeBtn = $('.close-btn');
    const $body = $('body');
    const $navLinks = $('.nav-item');

    // Apre/chiude il menu al click sull'hamburger
    $hamburger.on('click', function(e) {
        e.stopPropagation();
        $(this).toggleClass('active');
        $nav.toggleClass('active');
        $body.toggleClass('nav-open');
        console.log('Hamburger clicked!'); // Debug
    });

    // Chiude il menu al click sul pulsante di chiusura
    $closeBtn.on('click', function() {
        $hamburger.removeClass('active');
        $nav.removeClass('active');
        $body.removeClass('nav-open');
    });

    // Chiude il menu quando si clicca al di fuori
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.main-nav, .hamburger-menu').length) {
            $hamburger.removeClass('active');
            $nav.removeClass('active');
            $body.removeClass('nav-open');
        }
    });

    // Chiude il menu quando si clicca su un link
    $navLinks.on('click', function() {
        $hamburger.removeClass('active');
        $nav.removeClass('active');
        $body.removeClass('nav-open');
    });

    // Debug: verifica che gli elementi esistano
    console.log('Hamburger element:', $hamburger.length);
    console.log('Nav element:', $nav.length);
    console.log('Close button:', $closeBtn.length);
});
