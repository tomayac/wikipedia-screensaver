(() => {
  const SSE_URL = 'https://wikipedia-edits.herokuapp.com/sse';
  const TILES = 9;

  const tilesContainer = document.querySelector('#tiles-container');
  const soundCheckbox = document.querySelector('#sound');
  const fullscreenCheckbox = document.querySelector('#fullscreen');

  fullscreenCheckbox.addEventListener('change', () => {
    if (fullscreenCheckbox.checked) {
      document.body.webkitRequestFullscreen();
    } else {
      document.webkitExitFullscreen();
    }
  });

  let voices = {};

  let lastPosition = 0;

  const isEmpty = o => Object.keys(o).length === 0 && JSON.stringify(o) ===
      JSON.stringify({});

  const getVoices = opt_googleOnlyVoices => {
    let localVoices = {};
    speechSynthesis.getVoices().filter(voice => {
      return opt_googleOnlyVoices ? /^Google/.test(voice.name) : true;
    }).map(voice => {
      localVoices[voice.lang.substr(0, 2)] = voice;
    });
    return localVoices;
  };

  const parseArticle = e => {
    let data = JSON.parse(e.data);
    let language = data.language;
    let voice = voices && voices[language] || false;
    if (voice) {
      data.article = data.article.replace(/_/g, ' ');
      hooks.forEach(hook => {
        hook(data, voice);
      });
    }
  };

  const logArticle = (data, lang) => {
    console.log(`(${lang}) ${data.article}`);
  };

  const speakArticle = (data, voice) => {
    setTimeout(() => {
      if (!speechSynthesis.speaking && !speechSynthesis.pending) {
        let utterance = new SpeechSynthesisUtterance();
        utterance.addEventListener('start', () => {
          displayArticle(data, voice.lang);
        });
        utterance.text = data.article;
        utterance.voice = voice;
        if (!sound.checked) {
          utterance.volume = 0;
        } else {
          utterance.volume = 100;
        }
        speechSynthesis.speak(utterance);
      }
    }, 0);
  };

  const displayArticle = (data, lang) => {
    let div = document.createElement('div');
    div.className = 'tile';
    let delta = Math.abs(parseInt(data.delta, 10)) % 255;
    div.style.backgroundColor = `rgb(
        ${Math.floor(Math.random() * 255)},
        ${Math.floor(Math.random() * 255)},
        ${Math.floor(Math.random() * 255)})`;
    let img = document.createElement('img');
    img.src = `./static/${lang.split('-')[0]}.svg`;
    img.className = 'flag';
    div.appendChild(img);
    let span = document.createElement('div');
    span.className = 'label';
    span.textContent = `${data.article}`;
    div.appendChild(span);
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

  const hooks = [
    speakArticle
  ];

  (() => {
    let source = new EventSource(SSE_URL);
    source.addEventListener('message', parseArticle);
    voices = getVoices(true);
    if (isEmpty(voices)) {
      voices = getVoices(false);
    }
    speechSynthesis.onvoiceschanged  = () => {
      voices = getVoices(true);
      if (isEmpty(voices)) {
        voices = getVoices(false);
      }
    };
  })();
})();