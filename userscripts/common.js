// ==UserScript==
// @name        casebook{killer} common
// @version     0.0.1
// @description Browser extension for casebook{killer}.
// @author      LLo77
// @copyright   2024, LLo77
// @license GNU GPL v3.0 or later. http://www.gnu.org/copyleft/gpl.html
// @match       *://*.kad.arbitr.ru/*
// @match       *://*.cdnjs.cloudflare.com/*
// @match       *://*.casebookkiller.github.io/*
// @exclude     *://*.casebookkiller.github.io/css/*
// @exclude     *://*.casebookkiller.github.io/fonts/*
// @resource    SQLJS             https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.11.0/sql-wasm.js
// @resource    KADCSS            https://casebookkiller.github.io/css/kad.css
// @resource    W3KADCSS          https://casebookkiller.github.io/css/w3.kad.css
// @resource    W3CUSTOMCSS       https://casebookkiller.github.io/css/w3.custom.css
// @resource    FONTAWESOME       https://casebookkiller.github.io/css/font-awesome.min.css
// @resource    BSICONS           https://casebookkiller.github.io/css/bootstrap-icons.min.css
// @grant       GM_addStyle
// @grant       GM_xmlhttpRequest
// @grant       GM_getResourceText
// @run-at      document-start
// ==/UserScript==

(function() {
  'use strict';
  if (location.hostname === 'kad.arbitr.ru') {
    // Подключение SQL.js
    GM_xmlhttpRequest({
      method : "GET",
      url : "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.11.0/sql-wasm.js",
      onload : (ev) =>
      {
        let e = document.createElement('script');
        e.innerText = ev.responseText;
        document.head.appendChild(e);
       }
    });

    function addGlobalStyle(css) {
        var head, style;
        head = document.getElementsByTagName('head')[0];
        if (!head) { return; }
        style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        head.appendChild(style);
    }

    // Подключение стилей
    addGlobalStyle(GM_getResourceText('BSICONS'));
    addGlobalStyle(GM_getResourceText('FONTAWESOME'));
    addGlobalStyle(GM_getResourceText('KADCSS'));
    addGlobalStyle(GM_getResourceText('W3KADCSS'));
    addGlobalStyle(GM_getResourceText('W3CUSTOMCSS'));

  }
})();