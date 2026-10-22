/**
 * TasteMatch Client-Side Single-File Router & Event Synchronizer
 * Manages hash-based routing between 41 page templates, DOM mounting into #tm-app-mount,
 * dynamic styling injection into #tm-active-page-style, script execution, and history navigation.
 */

    (function () {
      'use strict';

      const PAGE_REGISTRY = {
        "Appetizers.html": "page-Appetizers_html",
        "Apple.html": "page-Apple_html",
        "Avocado Shake.html": "page-Avocado_Shake_html",
        "Bananaque.html": "page-Bananaque_html",
        "Beef Kebab.html": "page-Beef_Kebab_html",
        "Beverages.html": "page-Beverages_html",
        "Bicol Express.html": "page-Bicol_Express_html",
        "Breakfast.html": "page-Breakfast_html",
        "Brownies.html": "page-Brownies_html",
        "Chicken Pomodoro.html": "page-Chicken_Pomodoro_html",
        "Chicken.html": "page-Chicken_html",
        "Chili Soup.html": "page-Chili_Soup_html",
        "Cravings.html": "page-Cravings_html",
        "Desserts.html": "page-Desserts_html",
        "Dinner.html": "page-Dinner_html",
        "Fish and Chips.html": "page-Fish_and_Chips_html",
        "French-Toast.html": "page-French-Toast_html",
        "Fruit Salad.html": "page-Fruit_Salad_html",
        "Lunch.html": "page-Lunch_html",
        "Mango with Fermented Fish Sauce.html": "page-Mango_with_Fermented_Fish_Sauce_html",
        "Margarita.html": "page-Margarita_html",
        "Miso.html": "page-Miso_html",
        "Paksiw na Isda.html": "page-Paksiw_na_Isda_html",
        "Pancake.html": "page-Pancake_html",
        "Pina Colada.html": "page-Pina_Colada_html",
        "Prime Steak.html": "page-Prime_Steak_html",
        "Putobumbong.html": "page-Putobumbong_html",
        "Sinigang na Isda.html": "page-Sinigang_na_Isda_html",
        "Sisig.html": "page-Sisig_html",
        "Soups.html": "page-Soups_html",
        "Spring.html": "page-Spring_html",
        "Tiramisu.html": "page-Tiramisu_html",
        "Waffles.html": "page-Waffles_html",
        "appetizers.html": "page-Appetizers_html",
        "apple.html": "page-Apple_html",
        "avocado shake.html": "page-Avocado_Shake_html",
        "bananaque.html": "page-Bananaque_html",
        "beef kebab.html": "page-Beef_Kebab_html",
        "beverages.html": "page-Beverages_html",
        "bicol express.html": "page-Bicol_Express_html",
        "breakfast.html": "page-Breakfast_html",
        "brownies.html": "page-Brownies_html",
        "chicken pomodoro.html": "page-Chicken_Pomodoro_html",
        "chicken.html": "page-Chicken_html",
        "chili soup.html": "page-Chili_Soup_html",
        "chocolate.html": "page-chocolate_html",
        "contact.html": "page-contact_html",
        "cravings.html": "page-Cravings_html",
        "desserts.html": "page-Desserts_html",
        "dinner.html": "page-Dinner_html",
        "disclaimers.html": "page-disclaimers_html",
        "faq.html": "page-faq_html",
        "fish and chips.html": "page-Fish_and_Chips_html",
        "french-toast.html": "page-French-Toast_html",
        "fruit salad.html": "page-Fruit_Salad_html",
        "index.html": "page-index_html",
        "lunch.html": "page-Lunch_html",
        "mango with fermented fish sauce.html": "page-Mango_with_Fermented_Fish_Sauce_html",
        "margarita.html": "page-Margarita_html",
        "miso.html": "page-Miso_html",
        "paksiw na isda.html": "page-Paksiw_na_Isda_html",
        "pancake.html": "page-Pancake_html",
        "pina colada.html": "page-Pina_Colada_html",
        "prime steak.html": "page-Prime_Steak_html",
        "privacy.html": "page-privacy_html",
        "profile.html": "page-profile_html",
        "saved-recipes.html": "page-profile_html",
        "savedrecipes.html": "page-profile_html",
        "saved.html": "page-profile_html",
        "saved-recipe.html": "page-profile_html",
        "putobumbong.html": "page-Putobumbong_html",
        "signin.html": "page-signin_html",
        "sinigang na isda.html": "page-Sinigang_na_Isda_html",
        "sisig.html": "page-Sisig_html",
        "soups.html": "page-Soups_html",
        "spring.html": "page-Spring_html",
        "tiramisu.html": "page-Tiramisu_html",
        "waffles.html": "page-Waffles_html",
      };


      // Active interval tracking for clean transitions
      const activeIntervals = [];
      const origSetInterval = window.setInterval;
      window.setInterval = function (fn, delay) {
        const id = origSetInterval(fn, delay);
        activeIntervals.push(id);
        return id;
      };
      function clearActiveIntervals() {
        while (activeIntervals.length) {
          clearInterval(activeIntervals.pop());
        }
        document.querySelectorAll('.food, .ripple').forEach(function (el) { el.remove(); });
      }

      // Navigation history state for instant, lag-free back navigation
      var currentActivePage = '';
      window.__previousRoute = 'index.html';

      // Universal global fallback helpers for inline event handlers
      window.goHome = function () {
        window.__navigateTo('index.html');
      };
      window.navigateBack = function () {
        var target = window.__previousRoute || 'index.html';
        window.__navigateTo(target);
      };
      window.toggleDarkMode = function () {
        document.body.classList.toggle('dark');
        localStorage.setItem('darkMode', document.body.classList.contains('dark'));
      };
      window.toggleMode = function () {
        document.body.classList.toggle('dark');
        localStorage.setItem('mode', document.body.classList.contains('dark') ? 'dark' : 'light');
      };

      // Universal navigation function (re-renders if already on route)
      window.__navigateTo = function (url) {
        if (!url) return;
        url = String(url).trim().replace(/^['"]|['"]$/g, '');
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:') || url.startsWith('tel:')) {
          window.location.href = url;
          return;
        }
        var targetHash = '#' + url;
        if (window.location.hash === targetHash) {
          renderCurrentRoute();
        } else {
          window.location.hash = targetHash;
        }
      };

      // Find template for a page
      function getTemplateForPage(pageName) {
        if (!pageName) return null;
        let cleanName = decodeURIComponent(pageName).trim();
        cleanName = cleanName.replace(/^#/, '').replace(/^\//, '');

        const tplId = PAGE_REGISTRY[cleanName] || PAGE_REGISTRY[cleanName.toLowerCase()];
        if (tplId) {
          return document.getElementById(tplId);
        }
        return null;
      }

      // Render active route
      function renderCurrentRoute() {
        clearActiveIntervals();

        let hash = window.location.hash || '';
        if (!hash || hash === '#' || hash === '#/') {
          hash = '#index.html';
        }

        let routeTarget = hash.substring(1);
        let anchorName = '';
        const aIdx = routeTarget.indexOf('#');
        if (aIdx !== -1) {
          anchorName = routeTarget.substring(aIdx + 1);
          routeTarget = routeTarget.substring(0, aIdx);
        }

        // Support query parameters e.g. "signin.html?redirect=profile.html"
        let pageName = routeTarget;
        let queryStr = '';
        const qIdx = routeTarget.indexOf('?');
        if (qIdx !== -1) {
          pageName = routeTarget.substring(0, qIdx);
          queryStr = routeTarget.substring(qIdx + 1);
        }

        // If in-page anchor like "#categories"
        if (!pageName.includes('.html')) {
          const anchorEl = document.getElementById(pageName);
          if (anchorEl) {
            anchorEl.scrollIntoView({ behavior: 'smooth' });
            return;
          }
        }

        // Prevent bounce loops: if unauthenticated user enters profile.html, route to signin immediately
        const isSavedRoute = (pageName === 'saved-recipes.html' || pageName === 'savedrecipes.html' || pageName === 'saved.html' || pageName === 'saved-recipe.html');
        if ((pageName === 'profile.html' || isSavedRoute) && !localStorage.getItem('currentUser')) {
          pageName = 'signin.html';
        }

        // Track last valid browsed route for instant zero-lag back navigation
        if (currentActivePage && currentActivePage !== 'signin.html') {
          if (currentActivePage !== 'profile.html' || localStorage.getItem('currentUser')) {
            window.__previousRoute = currentActivePage;
          }
        }
        currentActivePage = pageName;

        let tpl = getTemplateForPage(pageName);
        if (!tpl) {
          tpl = getTemplateForPage('index.html');
        }
        if (!tpl) return;

        // Update document title
        document.title = tpl.dataset.title || 'TasteMatch';

        // Update body classes and styles
        document.body.className = tpl.dataset.bodyClass || '';
        if (tpl.dataset.bodyStyle) {
          document.body.style.cssText = tpl.dataset.bodyStyle;
        } else {
          document.body.removeAttribute('style');
        }

        // Update active page CSS
        const styleEl = document.getElementById('tm-active-page-style');
        const tplStyle = tpl.content.querySelector('style');
        styleEl.textContent = tplStyle ? tplStyle.textContent : '';

        // Clone content
        const clone = tpl.content.cloneNode(true);

        // Remove style from clone
        const cStyle = clone.querySelector('style');
        if (cStyle) cStyle.remove();

        // Extract scripts to execute sequentially after mount
        const scripts = Array.from(clone.querySelectorAll('script'));
        scripts.forEach(function (s) { s.remove(); });

        // Mount DOM
        const mount = document.getElementById('tm-app-mount');
        mount.innerHTML = '';
        mount.appendChild(clone);

        // Execute scripts in order with isolated exception handling
        scripts.forEach(function (oldScript) {
          try {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(function (attr) {
              newScript.setAttribute(attr.name, attr.value);
            });
            newScript.textContent = oldScript.textContent;
            mount.appendChild(newScript);
          } catch (err) {
            console.error('Route script execution error:', err);
          }
        });

        // Initialize comments module if comments container is present
        if (window.initRecipeComments && mount.querySelector('.comments')) {
          window.initRecipeComments();
        }

        // If navigating to saved recipes, ensure tab-saved is active
        if (isSavedRoute || queryStr.includes('tab=saved')) {
          setTimeout(function () {
            const tabBtn = mount.querySelector('.tab-button[data-tab="tab-saved"]');
            if (tabBtn) tabBtn.click();
          }, 50);
        }

        // Scroll to in-page anchor if provided
        if (anchorName) {
          setTimeout(function () {
            const anchorEl = document.getElementById(anchorName);
            if (anchorEl) anchorEl.scrollIntoView({ behavior: 'smooth' });
          }, 80);
        }

        // Re-bind recipe-card data-link clicks if any
        mount.querySelectorAll('.recipe-card[data-link]').forEach(function (card) {
          card.style.cursor = 'pointer';
          card.addEventListener('click', function (e) {
            if (e.target.closest('.favorite-button') || e.target.closest('.delete-button') || e.target.closest('.edit-button')) return;
            const link = card.getAttribute('data-link');
            if (link) window.__navigateTo(link);
          });
        });

        // Scroll to top if no anchor
        if (!anchorName) {
          window.scrollTo(0, 0);
        }
      }

      // Intercept clicks on links globally
      document.addEventListener('click', function (e) {
        const a = e.target.closest('a');
        if (!a) return;

        const href = a.getAttribute('href');
        if (!href) return;

        // Allow external links
        if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
          return;
        }

        // In-page hash on current page
        if (href.startsWith('#')) {
          const targetId = href.substring(1);
          const targetEl = document.getElementById(targetId);
          if (targetEl) {
            e.preventDefault();
            targetEl.scrollIntoView({ behavior: 'smooth' });
            return;
          }
        }

        // Internal page links
        if (href.includes('.html') || PAGE_REGISTRY[href] || PAGE_REGISTRY[href.toLowerCase()]) {
          e.preventDefault();
          window.__navigateTo(href);
        }
      }, true);

      // Listen to hash changes for browser Back / Forward buttons
      window.addEventListener('hashchange', renderCurrentRoute);

      // Initial mount on page load
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderCurrentRoute);
      } else {
        renderCurrentRoute();
      }

      // Expose router utilities globally
      window.TasteMatchRouter = {
        renderCurrentRoute: renderCurrentRoute,
        getTemplateForPage: getTemplateForPage,
        PAGE_REGISTRY: PAGE_REGISTRY
      };
    })();
