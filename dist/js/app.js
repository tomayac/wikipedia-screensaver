"use strict";!function(e,n,t){var i="https://wikipedia-edits.herokuapp.com/sse",c=9,s=n("#tiles-container"),r=n("#sound"),a=n("#fullscreen"),o={},l=0,u=function(e){return 0===Object.keys(e).length&&JSON.stringify(e)===JSON.stringify({})},d=function(e){var n={};return speechSynthesis.getVoices().filter(function(n){return e?/^Google/.test(n.name):!0}).map(function(e){n[e.lang.substr(0,2)]=e}),n},h=function(e){var n=JSON.parse(e.data),t=n.language,i=o&&o[t]||!1;i&&(n.article=n.article.replace(/_/g," "),p.forEach(function(e){return e(n,i)}))},f=function(e,n){setTimeout(function(){if(!speechSynthesis.speaking&&!speechSynthesis.pending){var t=new SpeechSynthesisUtterance;t.addEventListener("start",function(){g(e,n.lang)}),t.text=e.article,t.voice=n,r.checked?t.volume=100:t.volume=0,speechSynthesis.speak(t)}},0)},g=function(e,n){var i=Math.floor,r=Math.random,a=t("div");a.className="tile",a.style.backgroundColor=("rgb(\n        "+i(255*r())+",\n        "+i(255*r())+",\n        "+i(255*r())+")").replace(/\n/g,"").replace(/\s/g,"");var o=t("img");o.src="img/"+n.split("-")[0]+".svg",o.className="flag",a.appendChild(o);var u=t("div");u.className="label",u.textContent=""+e.article,a.appendChild(u),s.children.length>c-1&&s.firstChild.remove();var d=Math.floor(Math.random()*(c-1));d===l&&(d=(d+1)%c),l=d,s.insertBefore(a,s.children.item(d))},p=[f];!function(){a.addEventListener("change",function(){a.checked?e.body.webkitRequestFullscreen():e.webkitExitFullscreen()});var n=new EventSource(i);n.addEventListener("message",h),o=d(!0),u(o)&&(o=d(!1)),speechSynthesis.onvoiceschanged=function(){o=d(!0),u(o)&&(o=d(!1))}}()}(document,document.querySelector.bind(document),document.createElement.bind(document));