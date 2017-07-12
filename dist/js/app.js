"use strict";!function(e){function n(n,t){var r=e.createEvent("Event");r.initEvent(n,!0,!1),t.dispatchEvent(r)}function t(n){return function(t,i){function s(){t(),e.removeEventListener(r.events.change,s,!1)}function c(){i(new TypeError),e.removeEventListener(r.events.error,c,!1)}n!==l.exit||e[r.element]?(e.addEventListener(r.events.change,s,!1),e.addEventListener(r.events.error,c,!1)):setTimeout(function(){i(new TypeError)},1)}}var r,i,s={w3:{enabled:"fullscreenEnabled",element:"fullscreenElement",request:"requestFullscreen",exit:"exitFullscreen",events:{change:"fullscreenchange",error:"fullscreenerror"}},webkit:{enabled:"webkitFullscreenEnabled",element:"webkitCurrentFullScreenElement",request:"webkitRequestFullscreen",exit:"webkitExitFullscreen",events:{change:"webkitfullscreenchange",error:"webkitfullscreenerror"}},moz:{enabled:"mozFullScreenEnabled",element:"mozFullScreenElement",request:"mozRequestFullScreen",exit:"mozCancelFullScreen",events:{change:"mozfullscreenchange",error:"mozfullscreenerror"}},ms:{enabled:"msFullscreenEnabled",element:"msFullscreenElement",request:"msRequestFullscreen",exit:"msExitFullscreen",events:{change:"MSFullscreenChange",error:"MSFullscreenError"}}},l=s.w3;for(i in s)if(s[i].enabled in e){r=s[i];break}l.enabled in e||!r||(e.addEventListener(r.events.change,function(t){t.stopPropagation(),t.stopImmediatePropagation(),e[l.enabled]=e[r.enabled],e[l.element]=e[r.element],n(l.events.change,t.target)},!1),e.addEventListener(r.events.error,function(e){n(l.events.error,e.target)},!1),e[l.enabled]=e[r.enabled],e[l.element]=e[r.element],e[l.exit]=function(){var n=e[r.exit]();return!n&&Promise?new Promise(t(l.exit)):n},Element.prototype[l.request]=function(){var e=this[r.request].apply(this,arguments);return!e&&Promise?new Promise(t(l.request)):e})}(document),function(e,n,t,r){var i=n("#tiles-container"),s=n("#sound"),l=n("#fullscreen"),c={},a=0,o=function(e){return 0===Object.keys(e).length&&JSON.stringify(e)===JSON.stringify({})},u=function(e){var n={};return speechSynthesis.getVoices().filter(function(n){return!e||/^Google/.test(n.name)}).map(function(e){n[e.lang.substr(0,2)]=e}),n},m=function(e){var n=e.wiki.replace("wiki","");e.language=n;var t=c[n]||!1;o(c)?d(e,n):t&&f.forEach(function(n){return n(e,t)})},d=function(e,n){var r=Math.floor,s=Math.random,l=t("div");l.className="tile",l.style.backgroundColor=("rgb(\n        "+r(255*s())+",\n        "+r(255*s())+",\n        "+r(255*s())+")").replace(/\n/g,"").replace(/\s/g,"");var c=t("img");c.src="img/"+n.split("-")[0]+".svg",c.className="flag",l.appendChild(c);var o=t("a");o.className="label",o.textContent=""+e.title,o.href=e.server_url+"/wiki/"+e.title.replace(/ /g,"_"),o.target="_blank",l.appendChild(o),i.children.length>8&&i.firstChild.remove();var u=Math.floor(8*Math.random());u===a&&(u=(u+1)%9),a=u,i.insertBefore(l,i.children.item(u))},f=[function(e,n){setTimeout(function(){if(!speechSynthesis.speaking&&!speechSynthesis.pending){var t=new SpeechSynthesisUtterance;t.addEventListener("start",function(){d(e,n.lang)}),t.text=e.title,n&&(t.voice=n),s.checked?t.volume=100:t.volume=0,speechSynthesis.speak(t)}},0)}];!function(){e.fullscreenEnabled?l.addEventListener("change",function(){l.checked?e.body.requestFullscreen():e.exitFullscreen()}):(l.remove(),n('label[for="fullscreen"]').remove());var t=r.connect("https://stream.wikimedia.org:443/rc");t.on("connect",function(){t.emit("subscribe","*")}),t.on("change",function(e){"edit"===e.type&&!1===e.bot&&0===e.namespace&&"wikidatawiki"!==e.wiki&&m(e)}),s.addEventListener("click",function(){var e=new SpeechSynthesisUtterance("Click");speechSynthesis.speak(e),c=u(!0),o(c)&&(c=u(!1)),speechSynthesis.onvoiceschanged=function(){c=u(!0),o(c)&&(c=u(!1))}}),c=u(!0),o(c)&&(c=u(!1)),speechSynthesis.onvoiceschanged=function(){c=u(!0),o(c)&&(c=u(!1))}}()}(document,document.querySelector.bind(document),document.createElement.bind(document),window.io);