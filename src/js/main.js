((doc, win, nav, $, html) => {
  'use strict';

  // The Server-Sent Event Source
  const SSE_URL = 'https://stream.wikimedia.org/v2/stream/recentchange';

  // The number of tiles to display
  const TILES = 9;

  // HTML element references
  const tilesContainer = $('#tiles-container');
  const soundCheckbox = $('#sound');
  const fullscreenCheckbox = $('#fullscreen');

  // Be less flashy if reduced motion is preferred
  const understandsPrefersReducedMotionMediaQuery =
      win.matchMedia('(prefers-reduced-motion)').media !== 'not all';
  let prefersReducedMotion = false;
  if (understandsPrefersReducedMotionMediaQuery) {
    const prefersReducedMotionMediaQuery =
        win.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion = prefersReducedMotionMediaQuery.matches;
    const prefersReducedMotionChanged = () => {
      prefersReducedMotion = prefersReducedMotionMediaQuery.matches;
      if (prefersReducedMotion) {
        tilesContainer.style.display = 'block';
      } else {
        tilesContainer.style.display = 'flex';
      }
    };
    prefersReducedMotionChanged();
    prefersReducedMotionMediaQuery.addListener(prefersReducedMotionChanged);
  }
  // Holds references to all relevant speech synthesis voices
  let voices = {};

  // Avoid refreshing the same tile, remember the last tile
  let lastPosition = 0;

  /**
   * Helper function to determine if an object is empty
   * @param {Object} o An object
   * @returns {Boolean} Whether o is an empty object or not
   */
  const isEmpty = (o) => Object.keys(o).length === 0 &&
      JSON.stringify(o) === JSON.stringify({});

  /**
   * Get the speech synthesis voices, prefer vendor's high-quality ones in
   * supported browsers.
   * @param {Boolean=} opt_vendorOnlyVoices Whether to only use vendor voices
   * @returns {Object} The supported speech synthesis voices
   */
  const getVoices = (opt_vendorOnlyVoices) => {
    const localVoices = {};
    speechSynthesis.getVoices().filter((voice) => {
      return opt_vendorOnlyVoices
          ? /^(Google|Microsoft)/.test(voice.name) : true;
    }).map((voice) => {
      localVoices[voice.lang.substr(0, 2)] = voice;
    });
    return localVoices;
  };

  /**
   * Parse the article and its language, for supported languages carry on with
   * hooks (allows for adding additional functions than just reading).
   * @param {Object} data The Web Socket data object
   * @returns {undefined}
   */
  const parseArticle = (data) => {
    const language = data.wiki.replace('wiki', '');
    data.language = language;
    const voice = voices[language] || false;
    if (!isEmpty(voices)) {
      if (voice) {
        hooks.forEach((hook) => hook(data, voice));
      }
    } else {
      displayArticle(data, language);
    }
  };

  /**
   * Reads out the currently edited article if no other speech event is live or
   * pending (Wikipedia edits happen too fast, stacking speech events would not
   * scale).
   * @param {Object} data The Web Socket data object
   * @param {Object} voice The speech synthesis voice
   * @returns {undefined}
   */
  const speakArticle = (data, voice) => {
    setTimeout(() => {
      if (!speechSynthesis.speaking && !speechSynthesis.pending) {
        const utterance = new SpeechSynthesisUtterance();
        // When the speech event starts, display the corresponding article
        utterance.addEventListener('start', () => {
          displayArticle(data, voice.lang);
        });
        utterance.text = data.title;
        if (voice) {
          utterance.voice = voice;
        }
        if (!soundCheckbox.checked) {
          utterance.volume = 0;
        } else {
          utterance.volume = 100;
        }
        speechSynthesis.speak(utterance);
      }
    }, 0);
  };

  /**
   * Displays the currently edited article.
   * @param {Object} data The Web Socket data object
   * @param {String} lang The language of the article
   * @returns {undefined}
   */
  const displayArticle = (data, lang) => {
    const div = html('div');
    div.className = 'tile';
    if (prefersReducedMotion) {
      div.style.backgroundColor = '#eee';
    } else {
      div.style.backgroundColor =
          // eslint-disable-next-line no-bitwise
          `#${(~~(Math.random() * (1 << 24))).toString(16)}`;
    }
    const img = html('img');
    // eslint-disable-next-line no-return-assign
    img.onerror = () => img.src = 'img/neutral.png';
    img.src = `img/${lang.split('-')[0]}.svg`;
    img.className = 'flag';
    div.appendChild(img);
    const a = html('a');
    a.className = 'label';
    a.textContent = `${data.title}`;
    a.href = `${data.server_url}/wiki/${data.title.replace(/ /g, '_')}`;
    a.target = '_blank';
    div.appendChild(a);
    // Remove the first tile if there would be more than TILES
    if (tilesContainer.children.length > TILES - 1) {
      tilesContainer.firstChild.remove();
    }
    let position = null;
    if (prefersReducedMotion) {
      tilesContainer.appendChild(div);
    } else {
      position = Math.floor(Math.random() * (TILES - 1));
      if (position === lastPosition) {
        position = (position + 1) % TILES;
      }
      tilesContainer.insertBefore(div, tilesContainer.children.item(position));
      lastPosition = position;
    }
  };

  // The hooks for actions to take
  const hooks = [
    speakArticle
  ];

  (() => {
    // Toggles fullscreen
    if (doc.fullscreenEnabled) {
      fullscreenCheckbox.addEventListener('change', () => {
        if (fullscreenCheckbox.checked) {
          doc.body.requestFullscreen();
        } else {
          doc.exitFullscreen();
        }
      });
    } else {
      fullscreenCheckbox.remove();
      $('label[for="fullscreen"]').remove();
    }

    // Start listening to Server-Sent Events
    const eventSource = new EventSource(SSE_URL);
    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'edit' && !data.bot &&
          data.namespace === 0 && data.wiki !== 'wikidatawiki') {
        parseArticle(data);
      }
    };

    // On all platforms speech synthesis events need initial user interaction
    soundCheckbox.addEventListener('click', () => {
      const utterance = new SpeechSynthesisUtterance(soundCheckbox.checked
          ? 'Sound on' : 'Sound off');
      speechSynthesis.speak(utterance);
      voices = getVoices(true);
      if (isEmpty(voices)) {
        voices = getVoices(false);
      }
      speechSynthesis.onvoiceschanged = () => {
        voices = getVoices(true);
        if (isEmpty(voices)) {
          voices = getVoices(false);
        }
      };
    });

    if ('getWakeLock' in nav) {
      const wakeLockCheckbox = $('#keep-awake');
      wakeLockCheckbox.style.display = 'block';
      wakeLockCheckbox.labels[0].style.display = 'block';
      let wakeLockObj = null;
      nav.getWakeLock('screen').then((wlObj) => {
        wakeLockObj = wlObj;
        let wakeLockRequest = null;
        const toggleWakeLock = () => {
          if (wakeLockRequest) {
            wakeLockRequest.cancel();
            wakeLockRequest = null;
            return;
          }
          wakeLockRequest = wakeLockObj.createRequest();
        };
        wakeLockCheckbox.addEventListener('click', () => {
          toggleWakeLock();
          return console.log(
              `Wake lock is ${wakeLockObj.active ? 'active' : 'not active'}`);
        });
      }).catch((err) => {
        return console.error('Could not obtain wake lock', err);
      });
    } else if ('WakeLock' in win) {
      const wakeLockCheckbox = $('#keep-awake');
      wakeLockCheckbox.style.display = 'block';
      wakeLockCheckbox.labels[0].style.display = 'block';

      let controller = new AbortController();
      const requestWakeLock = () => {
        controller = new AbortController();
        const signal = controller.signal;
        win.WakeLock.request('screen', {signal}).
        catch((e) => {
          if (e.name === 'AbortError') {
            console.log('Wake Lock was aborted');
          } else {
            console.error(e.name, e.message);
          }
          wakeLockCheckbox.checked = false;
          return;
        });
        console.log('Wake Lock is active');
        wakeLockCheckbox.checked = true;
      };

      wakeLockCheckbox.addEventListener('click', () => {
        if (wakeLockCheckbox.checked) {
          return requestWakeLock();
        }
        return controller.abort();
      });
    }
  })();
})(document, window, navigator, document.querySelector.bind(document),
    document.createElement.bind(document));
