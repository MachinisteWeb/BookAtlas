/* global gsap */
/*------------------------------------*\
	$CARDS VIEWER
\*------------------------------------*/

(function () {
	"use strict";

	var CARD_CENTER_SPACING = 250;
	var GAP_COMPRESS_FACTOR = 0.55;
	var ROTATION_ZONE_CARDS = 2.5;
	var BACK_CARD_DEPTH = 120;
	var DRAG_THRESHOLD = 8;
	/** Touch screens often emit small spurious touchmove deltas; use a looser bound when classifying tap vs swipe on touchend. */
	var TOUCH_TAP_THRESHOLD = 22;
	var FLIP_DURATION = 0.6;
	var SNAP_DURATION = 0.35;
	var INERTIA_THRESHOLD = 0.3;
	var INERTIA_FRICTION = 0.92;
	var ELASTIC_OVERSHOOT = 80;
	var ELASTIC_DURATION = 0.6;

	var jukeboxData = [];
	var jukeboxDataReady = null;
	var isJukeboxReady = false;
	var jukeboxInitialized = false;
	var CARD_COUNT = 0;

	var scrollOffset = 0;
	var maxScroll = 0;
	var lastCentralIndex = 0;
	var isDragging = false;
	var dragStartX = 0;
	var dragStartY = 0;
	var dragStartScroll = 0;
	var isClick = true;
	var cardSlots = [];
	var lastScrollOffset = 0;
	var lastMoveTime = 0;
	var scrollVelocity = 0;
	var inertiaRaf = null;
	var snapTween = null;
	var lyricsInteraction = null;
	var justFinishedDragging = false;

	var viewer, cardsWrapper, parallaxBg, parallaxInner;

	var PLACEHOLDER_IMG = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

	function getJukeboxApiUrl() {
		var viewerEl = document.querySelector('.cards-viewer');
		var url = viewerEl && viewerEl.getAttribute('data-api-url');
		if (url) return url;
		var base = document.querySelector('base');
		return (base ? base.getAttribute('href') : window.location.origin + '/') + 'json/jukebox/';
	}

	function loadJukeboxData() {
		if (jukeboxDataReady) return jukeboxDataReady;
		var apiUrl = getJukeboxApiUrl();
		jukeboxDataReady = fetch(apiUrl)
			.then(function (r) { return r.json(); })
			.then(function (data) {
				if (Array.isArray(data)) {
					jukeboxData = data;
				} else if (data && typeof data === 'object' && !Array.isArray(data)) {
					jukeboxData = Object.keys(data).filter(function (k) { return /^\d+$/.test(k); }).sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); }).map(function (k) { return data[k]; });
				} else {
					jukeboxData = [];
				}
				CARD_COUNT = jukeboxData.length;
				isJukeboxReady = true;
				document.body.classList.remove('cards-viewer-loading');
				return jukeboxData;
			})
			.catch(function () {
				jukeboxData = [];
				CARD_COUNT = 0;
				isJukeboxReady = true;
				document.body.classList.remove('cards-viewer-loading');
				return jukeboxData;
			});
		return jukeboxDataReady;
	}

	function loadViewerImages() {
		var imgs = document.querySelectorAll('.cards-viewer img[data-src], .cards-viewer--parallax-bg img[data-src]');
		for (var j = 0; j < imgs.length; j++) {
			var img = imgs[j];
			var src = img.getAttribute('data-src');
			if (src) {
				img.src = src;
				img.removeAttribute('data-src');
			}
		}
	}

	document.addEventListener('cards-viewer-preload', loadViewerImages);

	function isInLyrics(el) {
		while (el && el !== viewer) {
			if (el.classList && el.classList.contains('cards-viewer--back-lyrics')) return true;
			el = el.parentNode;
		}
		return false;
	}

	function getLyricsElement(el) {
		return el && el.closest ? el.closest('.cards-viewer--back-lyrics') : null;
	}

	function formatLyrics(text) {
		if (!text) return '';
		return text.split(/(?:\r?\n){2,}/).filter(function (para) { return para.trim(); }).map(function (para) {
			var lines = para.split(/\r?\n/);
			return '<p>' + lines.join('<br />') + '</p>';
		}).join('');
	}

	function getCardPosition(index) {
		return index * CARD_CENTER_SPACING;
	}

	function createCards() {
		if (!cardsWrapper || !jukeboxData.length) return;
		cardsWrapper.innerHTML = '';
		cardSlots = [];
		var defaultVideo = jukeboxData[0] && jukeboxData[0].video ? jukeboxData[0].video : '';
		for (var i = 0; i < CARD_COUNT; i++) {
			var c = jukeboxData[i];
			var bg = c.background || '';
			var bgBack = c['background-back'] || '';
			var videoId = c.video || defaultVideo;
			var slot = document.createElement('div');
			slot.className = 'cards-viewer--slot';
			slot.dataset.index = i;
			var card = document.createElement('div');
			card.className = 'cards-viewer--card';
			card.dataset.index = i;
			card.innerHTML = '<div class="cards-viewer--face cards-viewer--face-front">' +
			    '<span class="cards-viewer--background-front"><img draggable="false" src="' + PLACEHOLDER_IMG + '" data-src="' + bg + '" alt="" /></span>' +
				'<span class="cards-viewer--background-back"><img draggable="false" src="' + PLACEHOLDER_IMG + '" data-src="' + bgBack + '" alt="" /></span>' +
				'<span class="cards-viewer--background-gradient"></span>' +
				'<span class="cards-viewer--title">' + (c.name || '') + '</span>' +
				'<span class="cards-viewer--from-universe">' + (c.univers || '') + '</span>' +
				'<span class="cards-viewer--id">' + (c.sound || '') + '</span></div>' +
				'<div class="cards-viewer--face cards-viewer--face-back">' +
				'<div class="cards-viewer--back-video" data-src="https://www.youtube.com/embed/' + videoId + '?rel=0&amp;enablejsapi=1">' +
				'</div>' +
				'<div class="cards-viewer--back-youtube-link"><a href="https://www.youtube.com/watch?v=' + videoId + '" target="_blank" rel="noopener noreferrer">Écouter sur YouTube : ' + videoId + '</a></div>' +
				'<div class="cards-viewer--back-lyrics">' + formatLyrics(c.lyrics || '') + '</div></div>';
			slot.appendChild(card);
			var backYoutubeLink = card.querySelector('.cards-viewer--back-youtube-link');
			if (backYoutubeLink) {
				['mousedown', 'mouseup', 'touchstart', 'touchend'].forEach(function (type) {
					backYoutubeLink.addEventListener(type, function (e) { e.stopPropagation(); }, false);
				});
			}
			cardsWrapper.appendChild(slot);
			cardSlots.push({ slot: slot, card: card });
		}
	}

	function updateLayout() {
		if (!viewer || !cardsWrapper || !parallaxBg) return;
		var totalContentWidth = (CARD_COUNT - 1) * CARD_CENTER_SPACING;
		maxScroll = Math.max(0, totalContentWidth);
		cardsWrapper.style.transform = 'translate(calc(-50% - ' + scrollOffset + 'px), -50%)';
		var cardData = cardSlots.map(function (_, index) {
			var distanceFromCenter = getCardPosition(index) - scrollOffset;
			var scale = Math.max(0.5, 1 - Math.abs(distanceFromCenter) * 0.002);
			var spacingOffset = -GAP_COMPRESS_FACTOR * distanceFromCenter * (1 - scale);
			var visualDistanceFromCenter = distanceFromCenter + spacingOffset;
			return { distanceFromCenter: distanceFromCenter, scale: scale, spacingOffset: spacingOffset, visualDistanceFromCenter: visualDistanceFromCenter };
		});
		var centralIndex = cardData.reduce(function (best, data, i) {
			return Math.abs(data.visualDistanceFromCenter) < Math.abs(cardData[best].visualDistanceFromCenter) ? i : best;
		}, 0);
		if (centralIndex !== lastCentralIndex) {
			var prevCard = cardSlots[lastCentralIndex].card;
			if (prevCard.classList.contains('flipped')) {
				prevCard.classList.remove('flipped');
				gsap.killTweensOf(prevCard);
				var scrollRight = centralIndex > lastCentralIndex;
				gsap.to(prevCard, { rotationY: scrollRight ? 0 : 360, duration: FLIP_DURATION, ease: 'power2.inOut' });
			}
			lastCentralIndex = centralIndex;
		}
		cardSlots.forEach(function (item, index) {
			var slot = item.slot;
			var data = cardData[index];
			var distanceFromCenter = data.distanceFromCenter;
			var scale = data.scale;
			var spacingOffset = data.spacingOffset;
			var visualDistanceFromCenter = data.visualDistanceFromCenter;
			slot.classList.toggle('is-central', index === centralIndex);
			var rotationFalloff = ROTATION_ZONE_CARDS * CARD_CENTER_SPACING;
			var maxRotateY = 75;
			var rotationFactor = 0.4;
			var absDist = Math.abs(distanceFromCenter);
			var falloff = Math.max(0, 1 - absDist / rotationFalloff);
			var rotateY = falloff * Math.max(-maxRotateY, Math.min(maxRotateY, distanceFromCenter * rotationFactor));
			var zIndex = Math.round(100000 - Math.abs(visualDistanceFromCenter) * 100);
			slot.style.left = (getCardPosition(index) + spacingOffset) + 'px';
			var translateZ = index === centralIndex ? 0 : -BACK_CARD_DEPTH;
			slot.style.transform = 'translateX(-50%) translateZ(' + translateZ + 'px) rotateY(' + rotateY + 'deg) scale(' + scale + ')';
			slot.style.zIndex = zIndex;
		});
		if (parallaxInner) {
			var imageWidth = parseInt(parallaxBg.getAttribute('data-image-width'), 10) || 4000;
			var maxBgOffset = Math.max(0, imageWidth - window.innerWidth);
			var rawOffset = maxScroll > 0 ? (scrollOffset / maxScroll) * maxBgOffset : 0;
			var bgOffset = Math.max(0, Math.min(maxBgOffset, rawOffset));
			parallaxInner.style.transform = 'translate(-' + bgOffset + 'px, -50%)';
		}
	}

	function clampScroll(value) {
		return Math.max(0, Math.min(maxScroll, value));
	}

	function softClamp(value) {
		return Math.max(-ELASTIC_OVERSHOOT, Math.min(maxScroll + ELASTIC_OVERSHOOT, value));
	}

	function isOutOfBounds() {
		return scrollOffset < 0 || scrollOffset > maxScroll;
	}

	function elasticBackThenSnap() {
		var target = clampScroll(scrollOffset);
		if (!isOutOfBounds()) { snapToClosestCard(); return; }
		if (snapTween) snapTween.kill();
		var scrollObj = { value: scrollOffset };
		snapTween = gsap.to(scrollObj, {
			value: target,
			duration: ELASTIC_DURATION,
			ease: 'elastic.out(0.6, 0.4)',
			onUpdate: function () { scrollOffset = scrollObj.value; updateLayout(); },
			onComplete: function () { snapTween = null; scrollOffset = target; snapToClosestCard(); }
		});
	}

	function startInertia(initialVelocity) {
		if (inertiaRaf) cancelAnimationFrame(inertiaRaf);
		var velocity = initialVelocity;
		var lastTime = performance.now();
		function inertiaStep() {
			var now = performance.now();
			var dt = Math.min(now - lastTime, 50);
			lastTime = now;
			scrollOffset = softClamp(scrollOffset + velocity * dt);
			velocity *= INERTIA_FRICTION;
			if (scrollOffset < 0 || scrollOffset > maxScroll) velocity *= 0.6;
			updateLayout();
			if (Math.abs(velocity) > 0.05) inertiaRaf = requestAnimationFrame(inertiaStep);
			else { inertiaRaf = null; elasticBackThenSnap(); }
		}
		inertiaRaf = requestAnimationFrame(inertiaStep);
	}

	function snapToClosestCard() {
		if (inertiaRaf) { cancelAnimationFrame(inertiaRaf); inertiaRaf = null; }
		var closestIndex = 0;
		var closestDist = Infinity;
		cardSlots.forEach(function (item, index) {
			var dist = Math.abs(getCardPosition(index) - scrollOffset);
			if (dist < closestDist) { closestDist = dist; closestIndex = index; }
		});
		var targetScroll = clampScroll(getCardPosition(closestIndex));
		if (Math.abs(targetScroll - scrollOffset) < 1) return;
		if (snapTween) snapTween.kill();
		var scrollObj = { value: scrollOffset };
		snapTween = gsap.to(scrollObj, {
			value: targetScroll,
			duration: SNAP_DURATION,
			ease: 'power2.out',
			onUpdate: function () { scrollOffset = scrollObj.value; updateLayout(); },
			onComplete: function () { snapTween = null; }
		});
	}

	function stopAllVideosExcept(excludeCard) {
		cardSlots.forEach(function (item) {
			if (item.card === excludeCard) return;
			var iframe = item.card.querySelector('.cards-viewer--back-video iframe');
			if (iframe && iframe.contentWindow) {
				try {
					iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
				} catch (e) {}
			}
		});
	}

	function loadVideoIframe(card) {
		var backVideo = card.querySelector('.cards-viewer--back-video');
		if (!backVideo || backVideo.querySelector('iframe') || !backVideo.dataset.src) return;
		var iframe = document.createElement('iframe');
		iframe.src = backVideo.dataset.src;
		iframe.title = 'Vidéo';
		iframe.setAttribute('frameborder', '0');
		iframe.setAttribute('allowfullscreen', '');
		iframe.onload = function () {
			attachYouTubePlayer(iframe, card);
		};
		backVideo.appendChild(iframe);
		['mousedown', 'mouseup', 'touchstart', 'touchend'].forEach(function (type) {
			backVideo.addEventListener(type, function (e) { e.stopPropagation(); }, false);
		});
	}

	function attachYouTubePlayer(iframe, card) {
		function tryAttach() {
			if (typeof YT !== 'undefined' && YT.Player) {
				new YT.Player(iframe, {
					events: {
						onStateChange: function (e) {
							if (e.data === 1) { stopAllVideosExcept(card); }
						}
					}
				});
				return true;
			}
			return false;
		}
		if (!tryAttach()) {
			var attempts = 0;
			var t = setInterval(function () {
				if (tryAttach() || ++attempts > 50) clearInterval(t);
			}, 100);
		}
	}

	function getFlipPointerTarget(e) {
		if (e.type === 'touchend' && e.changedTouches && e.changedTouches[0]) {
			var pt = e.changedTouches[0];
			return document.elementFromPoint(pt.clientX, pt.clientY) || e.target;
		}
		return e.target;
	}

	function handleFlip(e) {
		var closestIndex = 0;
		var closestDist = Infinity;
		cardSlots.forEach(function (item, index) {
			var dist = Math.abs(getCardPosition(index) - scrollOffset);
			if (dist < closestDist) { closestDist = dist; closestIndex = index; }
		});
		var centralCard = cardSlots[closestIndex].card;
		var target = getFlipPointerTarget(e);
		while (target && target !== viewer) {
			if (target === centralCard) {
				var willBeFlipped = !centralCard.classList.contains('flipped');
				centralCard.classList.toggle('flipped');
				if (willBeFlipped) loadVideoIframe(centralCard);
				gsap.killTweensOf(centralCard);
				gsap.to(centralCard, { rotationY: willBeFlipped ? 180 : 0, duration: FLIP_DURATION, ease: 'power2.inOut' });
				return;
			}
			target = target.parentNode;
		}
	}

	function init() {
		document.body.classList.add('cards-viewer-loading');
		loadJukeboxData();
		viewer = document.getElementsByClassName('cards-viewer')[0];
		cardsWrapper = document.getElementsByClassName('cards-viewer--wrapper')[0];
		parallaxBg = document.getElementsByClassName('cards-viewer--parallax-bg')[0];
		parallaxInner = parallaxBg && parallaxBg.querySelector('.cards-viewer--parallax-bg-inner');
		if (parallaxInner) {
			var imageWidth = parseInt(parallaxBg.getAttribute('data-image-width'), 10) || 4000;
			parallaxInner.style.width = imageWidth + 'px';
		}
		if (!viewer || !cardsWrapper || !parallaxBg || typeof gsap === 'undefined') {
			document.body.classList.remove('cards-viewer-loading');
			return;
		}
		loadJukeboxData().then(function () {
			runInitAfterJukeboxReady();
		});

		document.addEventListener('click', function (e) {
			var el = e.target && e.target.nodeType === 1 ? e.target : (e.target && e.target.parentElement);
			var openEl = el && el.closest ? el.closest('.cards-viewer-open') : null;
			var closeEl = el && el.closest ? el.closest('.cards-viewer-close') : null;
			var clickOnBackdrop = viewer && el && el.classList && el.classList.contains('cards-viewer--backdrop');
			var clickOnViewerOnly = viewer && el === viewer;
			var shouldCloseOnBackdrop = (clickOnBackdrop || clickOnViewerOnly) && !justFinishedDragging;
			if (openEl) {
				e.preventDefault();
				e.stopPropagation();
				if (jukeboxInitialized) {
					if (parallaxBg) parallaxBg.classList.remove('is-hidden');
					if (viewer) viewer.classList.remove('is-hidden');
				} else {
					loadJukeboxData().then(function () {
						createCards();
						updateLayout();
						loadViewerImages();
						jukeboxInitialized = true;
						if (parallaxBg) parallaxBg.classList.remove('is-hidden');
						if (viewer) viewer.classList.remove('is-hidden');
					});
				}
			} else if (closeEl || shouldCloseOnBackdrop) {
				e.preventDefault();
				e.stopPropagation();
				if (parallaxBg) parallaxBg.classList.add('is-hidden');
				if (viewer) viewer.classList.add('is-hidden');
			}
		}, true);
	}

	function runInitAfterJukeboxReady() {
		if (!viewer || !cardsWrapper || !parallaxBg || typeof gsap === 'undefined') return;
		viewer.addEventListener('dragstart', function (e) { e.preventDefault(); }, false);
		document.addEventListener('mousedown', function (e) {
			var lyricsEl = getLyricsElement(e.target);
			lyricsInteraction = lyricsEl ? { scrollTop: lyricsEl.scrollTop } : null;
		}, true);
		document.addEventListener('touchstart', function (e) {
			var lyricsEl = getLyricsElement(e.target);
			lyricsInteraction = lyricsEl && e.touches.length ? { scrollTop: lyricsEl.scrollTop } : null;
		}, true);
		viewer.addEventListener('mousedown', function (e) {
			if (snapTween) snapTween.kill();
			if (inertiaRaf) cancelAnimationFrame(inertiaRaf);
			isDragging = true;
			isClick = true;
			dragStartX = e.clientX;
			dragStartY = e.clientY;
			dragStartScroll = scrollOffset;
			lastScrollOffset = scrollOffset;
			lastMoveTime = performance.now();
			scrollVelocity = 0;
		});
		viewer.addEventListener('mousemove', function (e) {
			if (!isDragging) return;
			var deltaX = e.clientX - dragStartX;
			var deltaY = e.clientY - dragStartY;
			if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) isClick = false;
			scrollOffset = softClamp(dragStartScroll - deltaX);
			var now = performance.now();
			var dt = now - lastMoveTime;
			if (dt > 0) scrollVelocity = (scrollOffset - lastScrollOffset) / dt;
			lastScrollOffset = scrollOffset;
			lastMoveTime = now;
			updateLayout();
		});
		viewer.addEventListener('mouseup', function (e) {
			if (!isDragging) return;
			isDragging = false;
			if (isClick) {
				var lyricsEl = getLyricsElement(e.target);
				var scrolledInLyrics = lyricsEl && lyricsInteraction && lyricsEl.scrollTop !== lyricsInteraction.scrollTop;
				lyricsInteraction = null;
				if (!scrolledInLyrics) handleFlip(e);
			} else {
				justFinishedDragging = true;
				setTimeout(function () { justFinishedDragging = false; }, 100);
				if (Math.abs(scrollVelocity) > INERTIA_THRESHOLD) startInertia(scrollVelocity);
				else elasticBackThenSnap();
			}
		});
		viewer.addEventListener('mouseleave', function () {
			if (isDragging) {
				isDragging = false;
				justFinishedDragging = true;
				setTimeout(function () { justFinishedDragging = false; }, 100);
				if (Math.abs(scrollVelocity) > INERTIA_THRESHOLD) startInertia(scrollVelocity);
				else elasticBackThenSnap();
			}
		});
		viewer.addEventListener('touchstart', function (e) {
			if (snapTween) snapTween.kill();
			if (inertiaRaf) cancelAnimationFrame(inertiaRaf);
			isDragging = true;
			isClick = true;
			dragStartX = e.touches[0].clientX;
			dragStartY = e.touches[0].clientY;
			dragStartScroll = scrollOffset;
			lastScrollOffset = scrollOffset;
			lastMoveTime = performance.now();
			scrollVelocity = 0;
		}, { passive: true });
		viewer.addEventListener('touchmove', function (e) {
			if (!isDragging) return;
			var deltaX = e.touches[0].clientX - dragStartX;
			var deltaY = e.touches[0].clientY - dragStartY;
			scrollOffset = softClamp(dragStartScroll - deltaX);
			var now = performance.now();
			var dt = now - lastMoveTime;
			if (dt > 0) scrollVelocity = (scrollOffset - lastScrollOffset) / dt;
			lastScrollOffset = scrollOffset;
			lastMoveTime = now;
			updateLayout();
		}, { passive: true });
		viewer.addEventListener('touchend', function (e) {
			if (!isDragging) return;
			isDragging = false;
			var t = e.changedTouches && e.changedTouches[0];
			var dx = t ? t.clientX - dragStartX : 0;
			var dy = t ? t.clientY - dragStartY : 0;
			var isTouchTap = t && Math.abs(dx) <= TOUCH_TAP_THRESHOLD && Math.abs(dy) <= TOUCH_TAP_THRESHOLD;
			if (isTouchTap) {
				var touchTarget = t ? document.elementFromPoint(t.clientX, t.clientY) : null;
				var lyricsEl = getLyricsElement(touchTarget || e.target);
				var scrolledInLyrics = lyricsEl && lyricsInteraction && lyricsEl.scrollTop !== lyricsInteraction.scrollTop;
				lyricsInteraction = null;
				if (!scrolledInLyrics) handleFlip(e);
			} else {
				justFinishedDragging = true;
				setTimeout(function () { justFinishedDragging = false; }, 100);
				if (Math.abs(scrollVelocity) > INERTIA_THRESHOLD) startInertia(scrollVelocity);
				else elasticBackThenSnap();
			}
		});
		viewer.addEventListener('touchcancel', function () {
			if (isDragging) {
				isDragging = false;
				justFinishedDragging = true;
				setTimeout(function () { justFinishedDragging = false; }, 100);
				if (Math.abs(scrollVelocity) > INERTIA_THRESHOLD) startInertia(scrollVelocity);
				else elasticBackThenSnap();
			}
		});
		createCards();
		updateLayout();
		window.addEventListener('resize', function () {
			scrollOffset = clampScroll(scrollOffset);
			updateLayout();
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
