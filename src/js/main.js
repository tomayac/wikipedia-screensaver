((doc, nav, $, html) => {
  'use strict';

  // The Server-Sent Event Source
  const SSE_URL = 'https://stream.wikimedia.org/v2/stream/recentchange';

  // The number of tiles to display
  const TILES = 9;

  // HTML element references
  const tilesContainer = $('#tiles-container');
  const soundCheckbox = $('#sound');
  const fullscreenCheckbox = $('#fullscreen');

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
   * Get the speech synthesis voices, prefer Google's high-quality ones in
   * supported browsers.
   * @param {Boolean=} opt_googleOnlyVoices Whether to only use Google voices
   * @returns {Object} The supported speech synthesis voices
   */
  const getVoices = (opt_googleOnlyVoices) => {
    const localVoices = {};
    speechSynthesis.getVoices().filter((voice) => {
      return opt_googleOnlyVoices ? /^Google/.test(voice.name) : true;
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
    const floor = Math.floor;
    const random = Math.random;
    const div = html('div');
    div.className = 'tile';
    div.style.backgroundColor = `rgb(
        ${floor(random() * 255)},
        ${floor(random() * 255)},
        ${floor(random() * 255)})`.replace(/\n/g, '').replace(/\s/g, '');
    const img = html('img');
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
    let position = Math.floor(Math.random() * (TILES - 1));
    if (position === lastPosition) {
      position = (position + 1) % TILES;
    }
    lastPosition = position;
    tilesContainer.insertBefore(div, tilesContainer.children.item(position));
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
      }).catch((err) => {
        return console.error('Could not obtain wake lock', err);
      });
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
    }
  })();
})(document, navigator, document.querySelector.bind(document),
    document.createElement.bind(document));
