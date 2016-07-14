((doc, $, html) => {
  'use strict';

  // The Server-Sent Event source
  const SSE_URL = 'https://wikipedia-edits.herokuapp.com/sse';

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
  const isEmpty = o => Object.keys(o).length === 0 &&
      JSON.stringify(o) === JSON.stringify({});

  /**
   * Get the speech synthesis voices, prefer Google's high-quality ones in
   * supported browsers.
   * @param {Boolean=} opt_googleOnlyVoices Whether to only use Google voices
   * @returns {Object} The supported speech synthesis voices
   */
  const getVoices = opt_googleOnlyVoices => {
    const localVoices = {};
    speechSynthesis.getVoices().filter(voice => {
      return opt_googleOnlyVoices ? /^Google/.test(voice.name) : true;
    }).map(voice => {
      localVoices[voice.lang.substr(0, 2)] = voice;
    });
    return localVoices;
  };

  /**
   * Parse the article and its language, for supported languages carry on with
   * hooks (allows for adding additional functions than just reading).
   * @param {Object} e The SSE data object
   * @returns {undefined}
   */
  const parseArticle = e => {
    const data = JSON.parse(e.data);
    const language = data.language;
    const voice = voices && voices[language] || false;
    if (voice) {
      data.article = data.article.replace(/_/g, ' ');
      hooks.forEach(hook => hook(data, voice));
    }
  };

  /**
   * Reads out the currently edited article if no other speech event is live or
   * pending (Wikipedia edits happen too fast, stacking speech events would not
   * scale).
   * @param {Object} data The SSE data object
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
        utterance.text = data.article;
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
   * @param {Object} data The SSE data object
   * @param {String} lang The languag of the article
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
    const span = html('div');
    span.className = 'label';
    span.textContent = `${data.article}`;
    div.appendChild(span);
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
    // Start listening to SSE events
    let source = new EventSource(SSE_URL);
    source.addEventListener('message', parseArticle);
    // On some platforms speech synthesis events need initial user interaction
    soundCheckbox.addEventListener('click', () => {
      const utterance = new SpeechSynthesisUtterance('Click');
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
    // Get all voices
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
  })();
})(document, document.querySelector.bind(document),
    document.createElement.bind(document));
