/**
 * ==========================================================================
 * TasteMatch - Main JavaScript Functionality & Global Event Handlers
 * ==========================================================================
 * Coordinates core application features, global navigation events,
 * responsive interactions, theme preferences, and module orchestration.
 */

(function () {
  'use strict';

  // Global TasteMatch namespace
  window.TasteMatch = window.TasteMatch || {};
  window.TasteMatch.version = '2.0.0';

  /* ==========================================================================
     1. Theme & Dark Mode Management
     ========================================================================== */
  function initTheme() {
    try {
      const isDark = localStorage.getItem('darkMode') === 'true' ||
                     localStorage.getItem('mode') === 'dark';
      if (isDark) {
        document.body.classList.add('dark');
      }
    } catch (e) {
      // Storage access may be restricted in private browsing
    }
  }

  // Universal toggle functions (defined for any inline onclick handlers)
  window.toggleDarkMode = function () {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    try {
      localStorage.setItem('darkMode', isDark);
      localStorage.setItem('mode', isDark ? 'dark' : 'light');
    } catch (e) {}
  };

  window.toggleMode = function () {
    window.toggleDarkMode();
  };

  /* ==========================================================================
     2. Global Navigation Helpers
     ========================================================================== */
  window.goHome = function () {
    if (typeof window.__navigateTo === 'function') {
      window.__navigateTo('index.html');
    } else {
      window.location.hash = '#index.html';
    }
  };

  window.navigateBack = function () {
    const target = window.__previousRoute || 'index.html';
    if (typeof window.__navigateTo === 'function') {
      window.__navigateTo(target);
    } else {
      window.location.hash = '#' + target;
    }
  };

  /* ==========================================================================
     3. Global Keyboard Shortcuts & Accessibility
     ========================================================================== */
  document.addEventListener('keydown', function (e) {
    // ESC key closes any open mobile menus, modals, or dropdowns
    if (e.key === 'Escape' || e.keyCode === 27) {
      const navMenu = document.querySelector('.nav-links, .nav-menu, #nav-menu, .mobile-menu');
      if (navMenu && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
      }
      const modal = document.querySelector('.modal.open, .tm-modal.active');
      if (modal) {
        modal.classList.remove('open', 'active');
      }
    }
  });

  /* ==========================================================================
     4. Mobile Navigation & Interactive Event Handlers
     ========================================================================== */
  document.addEventListener('click', function (e) {
    // Hamburger Menu Toggle
    const burger = e.target.closest('.hamburger, .menu-toggle, #hamburger-btn');
    if (burger) {
      const targetNav = document.querySelector('.nav-links, .nav-menu, #nav-menu');
      if (targetNav) {
        targetNav.classList.toggle('active');
      }
      return;
    }

    // Auto-close mobile menu on nav link click
    if (e.target.closest('.nav-links a, .nav-menu a')) {
      const openNav = document.querySelector('.nav-links.active, .nav-menu.active');
      if (openNav) openNav.classList.remove('active');
    }
  });

  /* ==========================================================================
     5. Application Initialization
     ========================================================================== */
  function onAppInit() {
    initTheme();

    // Notify components that TasteMatch main application script is ready
    if (typeof CustomEvent === 'function' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('tasteMatchReady', {
        detail: { timestamp: Date.now() }
      }));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onAppInit);
  } else {
    onAppInit();
  }

})();
