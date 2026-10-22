/**
 * ==========================================================================
 * TasteMatch Modern Recipe Comments & Reviews Module
 * ==========================================================================
 * Provides rich recipe reviews with star ratings, avatars, timestamps, sorting,
 * likes, and author ownership permissions.
 * Fully synchronized with Firebase Cloud Firestore (collection: 'recipe_comments')
 * for real-time live updates across all accounts and devices.
 */

(function () {
  'use strict';

  // Ensure style.css is loaded (contains all comments styling)
  if (!document.querySelector('link[href*="style.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'style.css';
    document.head.appendChild(link);
  }

  // Avatar Color Palette for consistent initials badges
  const avatarColors = [
    'linear-gradient(135deg, #00baba, #008f8f)',
    'linear-gradient(135deg, #ff6b6b, #ff8e53)',
    'linear-gradient(135deg, #6E260E, #96351e)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #0284c7, #0369a1)',
    'linear-gradient(135deg, #7c3aed, #6d28d9)'
  ];

  function getAvatarBg(name) {
    let hash = 0;
    const str = String(name || 'User');
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % avatarColors.length;
    return avatarColors[index];
  }

  window.getAvatarBg = getAvatarBg;

  function timeAgo(timestamp) {
    if (!timestamp) return 'Recently';
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;

    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function escapeHtml(str = '') {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  const initRecipeComments = window.initRecipeComments = function (targetContainer, customRecipeId) {
    const commentContainer = (targetContainer && targetContainer.nodeType)
      ? targetContainer
      : (typeof targetContainer === 'string' ? document.querySelector(targetContainer) : document.querySelector('.comments'));
    if (!commentContainer) return;

    let recipeId = customRecipeId ? String(customRecipeId).trim() : null;
    if (!recipeId) {
      const recipeCard = document.querySelector('.recipe-card');
      const rawId = (recipeCard && recipeCard.dataset.recipe)
        ? recipeCard.dataset.recipe
        : (document.title.split('|')[0].trim() || 'recipe');
      recipeId = rawId.trim();
    }

    const storageKey = `comments_${recipeId}`;

    // Clean up any existing Firestore snapshot listener on this container or window
    if (commentContainer.__commentsUnsubscribe) {
      try { commentContainer.__commentsUnsubscribe(); } catch (e) { }
      commentContainer.__commentsUnsubscribe = null;
    } else if (!targetContainer && window.__currentCommentsUnsubscribe) {
      try { window.__currentCommentsUnsubscribe(); } catch (e) { }
      window.__currentCommentsUnsubscribe = null;
    }

    // Initialize from local cache for instant zero-latency first render
    let comments = JSON.parse(localStorage.getItem(storageKey)) || [];

    // Sanitize comment structure
    comments = comments.map(c => ({
      id: c.id || ('local_' + Math.random().toString(36).substr(2, 9)),
      recipeId: c.recipeId || recipeId,
      userId: c.userId || '',
      name: c.userName || c.name || 'Anonymous Chef',
      email: c.userEmail || c.email || '',
      text: c.text || '',
      rating: Number(c.rating) || 0,
      timestamp: c.timestamp || Date.now(),
      likes: Number(c.likes) || 0,
      likedBy: Array.isArray(c.likedBy) ? c.likedBy : []
    }));

    let selectedFormRating = 0;
    let currentSort = 'newest';

    function render() {
      // Read current active user session
      const activeUser = (typeof auth !== 'undefined' && auth && auth.currentUser) ? auth.currentUser : null;
      const currentUserId = activeUser ? activeUser.uid : (localStorage.getItem('currentUserId') || '');
      const currentUser = activeUser
        ? (activeUser.displayName || (activeUser.email ? activeUser.email.split('@')[0] : 'User'))
        : (localStorage.getItem('currentUser') || '');

      // Build Comments UI Template
      commentContainer.innerHTML = `
        <div class="comments-wrapper">
          <div class="comments-header">
            <h3>
              Reviews & Comments
              <span class="comments-count-badge">${comments.length}</span>
            </h3>
            ${comments.length > 1 ? `
            <div class="comments-sort">
              <label for="tm-sort-select">Sort by:</label>
              <select id="tm-sort-select">
                <option value="newest" ${currentSort === 'newest' ? 'selected' : ''}>Newest First</option>
                <option value="highest" ${currentSort === 'highest' ? 'selected' : ''}>Highest Rating</option>
                <option value="likes" ${currentSort === 'likes' ? 'selected' : ''}>Most Liked</option>
              </select>
            </div>` : ''}
          </div>

          <!-- Review Composition Form -->
          <div class="tm-comment-form">
            <div class="tm-user-status">
              <div class="tm-user-info">
                <div class="tm-avatar" style="background: ${getAvatarBg(currentUser || 'Guest')}">
                  ${(currentUser ? currentUser.charAt(0).toUpperCase() : '👤')}
                </div>
                <div>
                  ${currentUser
          ? `<span><strong>${escapeHtml(currentUser)}</strong></span> <span class="tm-user-tag" style="background:rgba(0,186,186,0.18); color:#007a7a;">✓ Signed In</span>`
          : `<span>Guest Chef</span> <a href="#signin.html?redirect=${encodeURIComponent(window.location.hash || '#index.html')}" class="tm-signin-link">(Sign in to use your account)</a>`}
                </div>
              </div>
              <div class="tm-form-rating">
                <span>Your Rating:</span>
                <div class="tm-stars-picker" id="tm-stars-picker">
                  <span class="tm-star-choice ${selectedFormRating >= 1 ? 'selected' : ''}" data-val="1">★</span>
                  <span class="tm-star-choice ${selectedFormRating >= 2 ? 'selected' : ''}" data-val="2">★</span>
                  <span class="tm-star-choice ${selectedFormRating >= 3 ? 'selected' : ''}" data-val="3">★</span>
                  <span class="tm-star-choice ${selectedFormRating >= 4 ? 'selected' : ''}" data-val="4">★</span>
                  <span class="tm-star-choice ${selectedFormRating >= 5 ? 'selected' : ''}" data-val="5">★</span>
                </div>
              </div>
            </div>

            ${!currentUser ? `
            <div class="tm-guest-name-group">
              <input type="text" id="tm-guest-name" class="tm-guest-name-input" placeholder="Your name (optional, defaults to Guest Chef)" maxlength="30">
            </div>` : ''}

            <textarea id="tm-comment-input" class="tm-textarea" placeholder="Share your experience with this recipe, cooking tips, or tweaks..." rows="3"></textarea>

            <div class="tm-form-footer">
              <span style="font-size: 0.8rem; color: var(--muted, #9ca3af);">
                ${currentUser ? `Posting as <strong>${escapeHtml(currentUser)}</strong>` : 'Be kind and helpful to fellow food lovers'}
              </span>
              <button id="tm-submit-comment" class="tm-post-btn">
                <span>Post Review</span> ✨
              </button>
            </div>
          </div>

          <!-- Comments List Feed -->
          <div class="tm-comments-list" id="tm-comments-list">
            ${renderCommentListHtml(comments, currentUserId, currentUser)}
          </div>
        </div>
      `;

      attachEventListeners();
    }

    function renderCommentListHtml(list, currentUserId, currentUser) {
      if (list.length === 0) {
        return `
          <div class="tm-empty-comments">
            <div class="tm-empty-icon">🍳 💬</div>
            <div class="tm-empty-title">No reviews yet</div>
            <div class="tm-empty-subtitle">Cooked this dish? Be the first to share your rating and tips!</div>
          </div>
        `;
      }

      // Sort comments
      const sorted = [...list];
      if (currentSort === 'newest') {
        sorted.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      } else if (currentSort === 'highest') {
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else if (currentSort === 'likes') {
        sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      }

      const likedComments = JSON.parse(localStorage.getItem(`liked_comments_${recipeId}`)) || {};

      return sorted.map((c) => {
        const isLiked = !!likedComments[c.id] || (currentUserId && Array.isArray(c.likedBy) && c.likedBy.includes(currentUserId));
        const starsHtml = c.rating > 0
          ? `<span class="tm-comment-stars">${'★'.repeat(c.rating)}${'☆'.repeat(5 - c.rating)}</span>`
          : '';
        const initial = c.name ? c.name.charAt(0).toUpperCase() : '👤';

        // Author ownership check: ONLY the account with matching UID is author
        const isAuthor = Boolean(
          (currentUserId && c.userId && currentUserId === c.userId) ||
          (!c.userId && currentUser && currentUser.toLowerCase() === (c.name || '').toLowerCase())
        );

        return `
          <div class="tm-comment-card" data-id="${escapeHtml(c.id)}">
            <div class="tm-comment-header">
              <div class="tm-comment-author-box">
                <div class="tm-avatar" style="background: ${getAvatarBg(c.name || 'User')}; width: 34px; height: 34px; font-size: 0.9rem;">
                  ${initial}
                </div>
                <div>
                  <div class="tm-author-name">
                    ${escapeHtml(c.name)}
                    ${isAuthor ? `<span class="tm-user-tag" style="background:rgba(0,186,186,0.18); color:#007a7a;">You</span>` : ''}
                  </div>
                  <span class="tm-comment-date">${timeAgo(c.timestamp)}</span>
                </div>
              </div>
              <div class="tm-comment-meta">
                ${starsHtml}
              </div>
            </div>

            <div class="tm-comment-body">${escapeHtml(c.text)}</div>

            <div class="tm-comment-actions">
              <button class="tm-like-btn ${isLiked ? 'liked' : ''}" data-id="${escapeHtml(c.id)}" title="Helpful review">
                <span class="tm-heart">${isLiked ? '❤️' : '🤍'}</span>
                <span class="tm-like-count">${c.likes || 0}</span>
              </button>

              ${isAuthor ? `
              <button class="tm-delete-btn" data-id="${escapeHtml(c.id)}" title="Delete comment">
                ✕ Delete
              </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    }

    function attachEventListeners() {
      // Star Rating Selection
      const starChoices = commentContainer.querySelectorAll('.tm-star-choice');
      starChoices.forEach(star => {
        star.onmouseenter = () => {
          const val = parseInt(star.dataset.val);
          starChoices.forEach(s => s.classList.toggle('hovered', parseInt(s.dataset.val) <= val));
        };
        star.onmouseleave = () => {
          starChoices.forEach(s => s.classList.remove('hovered'));
        };
        star.onclick = () => {
          const val = parseInt(star.dataset.val);
          selectedFormRating = (selectedFormRating === val) ? 0 : val;
          starChoices.forEach(s => s.classList.toggle('selected', parseInt(s.dataset.val) <= selectedFormRating));
        };
      });

      // Sort Selection
      const sortSelect = commentContainer.querySelector('#tm-sort-select');
      if (sortSelect) {
        sortSelect.onchange = (e) => {
          currentSort = e.target.value;
          render();
        };
      }

      // Submit Review Button
      const submitBtn = commentContainer.querySelector('#tm-submit-comment');
      const commentInput = commentContainer.querySelector('#tm-comment-input');
      const guestNameInput = commentContainer.querySelector('#tm-guest-name');

      if (submitBtn && commentInput) {
        submitBtn.onclick = async () => {
          const text = commentInput.value.trim();
          if (!text) {
            commentInput.focus();
            commentInput.style.borderColor = '#ef4444';
            setTimeout(() => commentInput.style.borderColor = '', 1500);
            return;
          }

          const activeUser = (typeof auth !== 'undefined' && auth && auth.currentUser) ? auth.currentUser : null;
          const currentUser = activeUser
            ? (activeUser.displayName || (activeUser.email ? activeUser.email.split('@')[0] : 'User'))
            : (localStorage.getItem('currentUser') || '');
          const currentUserId = activeUser ? activeUser.uid : (localStorage.getItem('currentUserId') || '');

          let authorName = currentUser;
          if (!authorName) {
            authorName = guestNameInput && guestNameInput.value.trim()
              ? guestNameInput.value.trim()
              : 'Guest Chef';
          }

          submitBtn.disabled = true;
          const origBtnContent = submitBtn.innerHTML;
          submitBtn.innerHTML = '<span>Saving to Firebase...</span> ⏳';

          const newCommentData = {
            recipeId: recipeId,
            userId: currentUserId || 'guest',
            userName: authorName,
            userEmail: activeUser ? (activeUser.email || '') : (localStorage.getItem('currentUserEmail') || ''),
            text: text,
            rating: selectedFormRating,
            likes: 0,
            likedBy: [],
            timestamp: Date.now()
          };

          let writeSucceeded = false;

          // 1. Write to Firebase Cloud Firestore (Primary Source of Truth)
          if (typeof db !== 'undefined' && db) {
            try {
              newCommentData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
              const docRef = await db.collection('recipe_comments').add(newCommentData);
              newCommentData.id = docRef.id;
              writeSucceeded = true;
              console.log('[TasteMatch] Comment saved to Firestore! Doc ID:', docRef.id);
            } catch (err) {
              console.error('[TasteMatch] Firestore comment write error:', err);
              if (err.message && err.message.includes('has not been used in project')) {
                alert('Firebase Notice: Cloud Firestore API is not yet activated in your Firebase Console for project tastematch-1f149.\n\nPlease visit: https://console.firebase.google.com/project/tastematch-1f149/firestore to create the database.');
              } else if (err.code === 'permission-denied') {
                alert('Firebase Permission Denied: Please verify your Firestore Security Rules in Firebase Console.');
              } else {
                alert('Firebase write failed: ' + (err.message || 'Unknown network error.'));
              }
            }
          } else {
            console.warn('[TasteMatch] Firebase db client not initialized.');
            alert('Firebase Database is not connected. Please verify your internet connection and Firebase setup.');
          }

          // If write succeeded or if operating offline with cache
          if (writeSucceeded) {
            commentInput.value = '';
            if (guestNameInput) guestNameInput.value = '';
            selectedFormRating = 0;
          } else {
            // Local optimistic copy for testing while database is pending creation
            const localComment = {
              id: 'local_' + Date.now(),
              ...newCommentData,
              name: authorName
            };
            comments.unshift(localComment);
            try {
              localStorage.setItem(storageKey, JSON.stringify(comments));
            } catch (e) { }
            render();
            commentInput.value = '';
            if (guestNameInput) guestNameInput.value = '';
            selectedFormRating = 0;
          }

          submitBtn.disabled = false;
          submitBtn.innerHTML = origBtnContent;
        };
      }

      // Likes Handler
      commentContainer.querySelectorAll('.tm-like-btn').forEach(btn => {
        btn.onclick = async () => {
          const commentId = btn.dataset.id;
          const likedComments = JSON.parse(localStorage.getItem(`liked_comments_${recipeId}`)) || {};
          const targetComment = comments.find(c => c.id === commentId);

          if (targetComment) {
            const wasLiked = !!likedComments[commentId];
            const delta = wasLiked ? -1 : 1;
            const activeUser = (typeof auth !== 'undefined' && auth && auth.currentUser) ? auth.currentUser : null;
            const uid = activeUser ? activeUser.uid : (localStorage.getItem('currentUserId') || 'guest');

            if (wasLiked) {
              delete likedComments[commentId];
            } else {
              likedComments[commentId] = true;
            }

            try {
              localStorage.setItem(`liked_comments_${recipeId}`, JSON.stringify(likedComments));
            } catch (e) { }

            // Optimistic update
            targetComment.likes = Math.max(0, (targetComment.likes || 0) + delta);
            render();

            // Sync with Cloud Firestore
            if (typeof db !== 'undefined' && db && !commentId.startsWith('local_')) {
              try {
                const docRef = db.collection('recipe_comments').doc(commentId);
                if (wasLiked) {
                  await docRef.update({
                    likes: firebase.firestore.FieldValue.increment(-1),
                    likedBy: firebase.firestore.FieldValue.arrayRemove(uid)
                  });
                } else {
                  await docRef.update({
                    likes: firebase.firestore.FieldValue.increment(1),
                    likedBy: firebase.firestore.FieldValue.arrayUnion(uid)
                  });
                }
              } catch (err) {
                console.warn('[TasteMatch] Firestore likes sync notice:', err.message);
              }
            }
          }
        };
      });

      // Delete Handler (Enforcing Strict Author-Only Deletions)
      commentContainer.querySelectorAll('.tm-delete-btn').forEach(btn => {
        btn.onclick = async () => {
          const commentId = btn.dataset.id;
          const targetComment = comments.find(c => c.id === commentId);
          if (!targetComment) return;

          const activeUser = (typeof auth !== 'undefined' && auth && auth.currentUser) ? auth.currentUser : null;
          const currentUserId = activeUser ? activeUser.uid : (localStorage.getItem('currentUserId') || '');
          const currentUserName = activeUser ? (activeUser.displayName || '') : (localStorage.getItem('currentUser') || '');

          // Verify ownership: Only original author can delete
          const isOwner = Boolean(
            (currentUserId && targetComment.userId && currentUserId === targetComment.userId) ||
            (!targetComment.userId && currentUserName && currentUserName.toLowerCase() === (targetComment.name || '').toLowerCase())
          );

          if (!isOwner) {
            alert('Permission denied: You can only delete reviews that you originally posted.');
            return;
          }

          if (!confirm('Are you sure you want to remove this review?')) return;

          btn.disabled = true;
          btn.textContent = 'Deleting...';

          // Delete from Cloud Firestore
          if (typeof db !== 'undefined' && db && !commentId.startsWith('local_')) {
            try {
              await db.collection('recipe_comments').doc(commentId).delete();
              console.log('[TasteMatch] Comment successfully removed from Firestore:', commentId);
            } catch (err) {
              console.error('[TasteMatch] Firestore comment delete error:', err);
              alert('Could not delete comment from database: ' + (err.message || 'Permission denied'));
              render();
              return;
            }
          }

          // Remove from local array
          comments = comments.filter(c => c.id !== commentId);
          try {
            localStorage.setItem(storageKey, JSON.stringify(comments));
          } catch (e) { }
          render();
        };
      });
    }

    // Connect Real-Time Cloud Firestore Snapshot Listener
    if (typeof db !== 'undefined' && db) {
      try {
        const query = db.collection('recipe_comments').where('recipeId', '==', recipeId);
        const unsubscribe = query.onSnapshot((snapshot) => {
          const cloudComments = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            cloudComments.push({
              id: doc.id,
              recipeId: data.recipeId || recipeId,
              userId: data.userId || '',
              name: data.userName || data.name || 'Anonymous Chef',
              email: data.userEmail || data.email || '',
              text: data.text || '',
              rating: Number(data.rating) || 0,
              timestamp: (data.createdAt && data.createdAt.toMillis) ? data.createdAt.toMillis() : (data.timestamp || Date.now()),
              likes: Number(data.likes) || 0,
              likedBy: Array.isArray(data.likedBy) ? data.likedBy : []
            });
          });

          // Live cloud data is central source of truth
          if (!snapshot.empty || cloudComments.length > 0) {
            comments = cloudComments;
            try {
              localStorage.setItem(storageKey, JSON.stringify(comments));
            } catch (e) { }
          }
          render();
        }, (error) => {
          if (error.message && error.message.includes('has not been used in project')) {
            console.warn('[TasteMatch Firebase Notice] Cloud Firestore database is pending activation in Firebase Console for project tastematch-1f149.');
          } else {
            console.warn('[TasteMatch] Firestore comments onSnapshot notice:', error.message);
          }
          render();
        });
        commentContainer.__commentsUnsubscribe = unsubscribe;
        if (!targetContainer) window.__currentCommentsUnsubscribe = unsubscribe;
      } catch (err) {
        console.warn('[TasteMatch] Could not initialize Firestore comments listener:', err);
        render();
      }
    }

    // Listen for storage events across tabs
    window.addEventListener('storage', (e) => {
      if (e.key === 'currentUser' || e.key === 'currentUserId' || e.key === storageKey) {
        comments = JSON.parse(localStorage.getItem(storageKey)) || [];
        render();
      }
    });

    window.addEventListener('authStateChanged', () => {
      render();
    });

    render();
  };

  // Expose global fallback functions for inline onclick calls
  window.addComment = function () {
    const btn = document.getElementById('tm-submit-comment');
    if (btn) btn.click();
  };
  window.removeComment = function (index) {
    // legacy placeholder
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initRecipeComments);
  } else {
    window.initRecipeComments();
  }
})();
