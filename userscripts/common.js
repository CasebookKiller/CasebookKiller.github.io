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

    /**
     * Функция для инъекции скрипта
     */
    function addJS_Node (text, s_URL, funcToRun, runOnLoad) {
      // Описание механизма инъекции
      // https://stackoverflow.com/questions/13485122/accessing-variables-from-greasemonkey-to-page-vice-versa/13485650#13485650
      let scriptNode = document.createElement ('script');
      if (runOnLoad) {
        scriptNode.addEventListener ("load", runOnLoad, false);
      }
      scriptNode.type = "text/javascript";
      if (text) scriptNode.textContent = text;
      if (s_URL) scriptNode.src = s_URL;
      if (funcToRun) scriptNode.textContent = '(' + funcToRun.toString() + ')()';

      let targ = document.getElementsByTagName ('head')[0] || document.body || document.documentElement;
      targ.appendChild (scriptNode);
    }


    /**
     * ===============================================
     *
     * Переопределение глобальных функий kad.arbitr.ru
     *
     * ===============================================
     */

    // Переопределение функции returnRequestInfo
    function returnRequestInfo(page, returnObject){
	    let info = {};

      info.Page = parseInt(page, 10) || 1;
      info.Count = 25;

      let groupByCategory;
      let $active = $('#filter-cases li.active').eq(0);
      if($active){
        if($active.hasClass('administrative')){
          groupByCategory = 'A';
        }
        if($active.hasClass('bankruptcy')){
          groupByCategory = 'B';
        }
        if($active.hasClass('civil')){
          groupByCategory = 'G';
        }
      }

      if (groupByCategory) {
        info.CaseType = groupByCategory;
      }

      let $courts = $('#caseCourt .js-select'),
        courtsArray = [];

      $.each($courts, function() {
        let $select = $(this),
          $options = $select.children('option'),
          $input = $select.parent().find('.js-input'),
          inputVal = $input.val();

        if (inputVal) {
          $.each($options, function() {
            let $option = $(this);

            if ($option.text() == inputVal) {
              courtsArray.push($option.val());
            }
          });
        }
      });

      /*if (globals.isVasEnteredInKad) {
        if (courtsArray) {
          for (let i = 0, max = courtsArray.length; i < max; i++) {
          if (globals.isVasEnteredInKad && (courtsArray[i] !== 'VAS')) {
          delete globals.isVasEnteredInKad;
          }
        }
        } else {
        delete globals.isVasEnteredInKad;
        }
      }*/

      info.Courts = courtsArray;

      let dates = $('#selected-dates').val() || '';
      dates = dates.replace(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/g, '$3.$2.$1').match(/\d{2,4}\.\d{1,2}\.\d{1,2}/g) || ['',''];
      dates[0] = (dates[0] || '2000.01.01').split('.');
      dates[1] = (dates[1] || '2030.01.01').split('.');
      console.log('dates: ', dates);
      //	info.DateFrom = Common.date.returnDotNetDate(
      //		Common.date.returnDateUTC(dates[0][0],dates[0][1],dates[0][2])
      //	);
      //	info.DateTo = Common.date.returnDotNetDate(
      //		Common.date.returnDateUTC(dates[1][0],dates[1][1],dates[1][2], 23, 59, 59)
      //	);

      dates = ($('#selected-dates').val() || '').split(' - ');

      if (dates[0] && !checkDate(dates[0]) || dates[1] && !checkDate(dates[1])) {
        showPageMessage({
          type: 'error',
          title: 'Ошибка',
          message: 'Введена неверная дата',
          right: 20
        });

        return false;
      }

      if (dates[0]) {
        info.DateFrom = dates[0].replace(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/g, '$3-$2-$1') + 'T00:00:00' || ['', '']; //'2000-01-01T00:00:00'
      } else {
        info.DateFrom = null;
      }

      if (dates[1]) {
        info.DateTo = dates[1].replace(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/g, '$3-$2-$1') + 'T23:59:59' || ['', '']; //'2000-01-01T00:00:00'
      } else {
        info.DateTo = null;
      }

      let tags = 'Sides,Judges,CaseNumbers'.split(','); //названия тегов
      let groups = 'sug-participants,sug-judges,sug-cases'.split(',');

      for(j in tags){
        let tag = tags[j];
        info[tag] = [];
        let field;
        if ($('#' + groups[j]+' input[type=text]').length ) {
          field = $('#' + groups[j] + ' input[type=text]');
        } else {
          field = $('#' + groups[j] + ' textarea');
        }
        field.each(function(){
          let $currentField = $(this);
          if(!$currentField.hasClass('g-ph')) {
            if (tag == "Sides") {
              info[tag].push({
                Name: $currentField.valEx(),
                Type: parseInt($currentField.closest('.tag').find('.b-type-switcher .selected input').val(), 10),
                ExactMatch: $currentField.data('exactmatch') ? true : false
              });
            } else if (tag == 'Judges') {
              let judgeId = $currentField.attr('id');

              // Тип судьи не является критерием поиска
              info[tag].push({
                JudgeId: judgeId,
                Type: -1 //$currentField.closest('.tag').find('.b-type-switcher .selected input').val() || 1
              });
            } else {
              info[tag].push($currentField.valEx());
            }
          }
        });
      }

      info.WithVKSInstances = $('.vksCheckClass').attr('checked');

      /*if (globals.isVasEnteredInKad) {
        info.InstanceLevel  = 1;
      }*/
      console.log('info: ', info);
      /*
        {
          "Page": 1,
          "Count": 25,
          "Courts": [
            "MSK"
          ],
          "DateFrom": "2012-01-01T00:00:00",
          "DateTo": "2013-12-31T23:59:59",
          "Sides": [
            {
              "Name": "МАСТЕР БАНК",
              "Type": -1,
              "ExactMatch": false
            }
          ],
          "Judges": [
            {
              "JudgeId": "50f923cd-9672-4a91-8285-b94cfbede836",
              "Type": -1
            }
          ],
          "CaseNumbers": [
            "а40-172055/2013"
          ],
          "WithVKSInstances": false
        }
      */
      return returnObject ? info : $.toJSON(info);
    }

    // Добавление нового определения функции returnRequestInfo
    addJS_Node (returnRequestInfo);

  }
})();