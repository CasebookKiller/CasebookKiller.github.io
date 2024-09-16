/**
 * Вспомогательные функции
 */

/**
 * Проверка запуска окна в iframe
 * @returns boolean
 */
function iniFrame() {
  let location = false;
  if (window.location !== window.parent.location) {
    location = true;
  } 

  let self = false;
  if (window.self !== window.top) {
    self = true;
  }
  
  console.log('location: ', location);
  console.log('self: ', self);

  return location && self;
}

/**
 * Проверка IndexedDB
 */ 
window.indexedDB =
  window.indexedDB ||
  window.mozIndexedDB ||
  window.webkitIndexedDB ||
  window.msIndexedDB;
window.IDBTransaction =
  window.IDBTransaction ||
  window.webkitIDBTransaction ||
  window.msIDBTransaction;
window.IDBKeyRange =
  window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

if (!window.indexedDB) {
  console.log(
    "Этот браузер не поддерживает стабильную версию IndexedDB. Сохранение базы данных невозможно",
  );
}

/**
 * -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
 * =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
 * -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
 */

/**
 * Прослушиватель для сообщений
 */
window.addEventListener('message', function(msg) {
  if (msg.origin === 'https://kad.arbitr.ru') {
    let obj = undefined;
    
    try {
      obj = JSON.parse(msg.data);
    } catch (err) {
      obj = msg.data;
    }

    if (obj.key === 'storage') {
      //console.log('msg:',msg);
      //console.log('obj:',obj);
      let info = obj.info !== undefined ? obj.info : '';
      let dates = obj.dates !== undefined ? obj.dates : '';
      try {
        info = JSON.parse(info);
        info.Id = Number(new Date());
      } catch (err) {
      }

      try {
        dates = JSON.parse(dates);
      } catch (err) {
      }

      //Сообщение отправленно в storage.html
      if (typeof(info) === 'object') {
        console.log('%cв storage.html поступил объект: %o','color:#FB74BD;', info);
        console.log('%c' + 'Id: %o','color:#FB74BD;', info.Id);
        console.log('%c' + 'Page: %o','color:#FB74BD;', info.Page);
        console.log('%c' + 'Count: %o','color:#FB74BD;', info.Count);
        console.log('%c' + 'Courts: %o','color:#FB74BD;',info.Courts);
        console.log('%c' + 'DateFrom: %o','color:#FB74BD;',info.DateFrom);
        console.log('%c' + 'DateTo: %o','color:#FB74BD;',info.DateTo);
        console.log('%c' + 'Sides: %o','color:#FB74BD;',info.Sides);
        console.log('%c' + 'Judges: %o','color:#FB74BD;',info.Judges);
        console.log('%c' + 'CaseNumbers: %o','color:#FB74BD;',info.CaseNumbers);
        console.log('%c' + 'WithVKSInstances: %o','color:#FB74BD;',info.WithVKSInstances);
      } else {
        console.log('%cв storage.html поступило сообщение: ','color:#FB74BD;', info);
      }

      if (typeof(dates) === 'object') {
        console.log('%cв storage.html поступил объект: %o','color:#FB74BD;', dates);
      } else {
        console.log('%cв storage.html поступило сообщение: ','color:#FB74BD;', dates);
      }
      
      // читать здесь
      // https://ru.stackoverflow.com/questions/1275278/%D0%9A%D0%B0%D0%BA-%D0%BE%D1%82%D0%BF%D1%80%D0%B0%D0%B2%D0%B8%D1%82%D1%8C-%D1%81%D0%BE%D0%BE%D0%B1%D1%89%D0%B5%D0%BD%D0%B8%D0%B5-%D0%B2-iframe-%D0%B8-%D0%BE%D0%B1%D1%80%D0%B0%D1%82%D0%BD%D0%BE
    }
    
  } else if (msg.origin === 'https://casebookkiller.github.io') {
    console.log(msg);
  }
},false);

/**
 * Настройка загрузки wasm
 */
let config = {
  locateFile: filename => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.11.0/${filename}`
}

if (document.cbk === undefined) {
  document.cbk = new Object();
  let cbk = document.cbk;
  cbk.storage = 'isloaded';
}

// Создание тестовой таблицы
function createTestDB(SQLitedb) {
  // Запрос на создание таблицы
  SQLitedb.run("CREATE TABLE test (col1, col2);");
  // Запрос на создание двух записей: (1,111) и (2,222)
  SQLitedb.run("INSERT INTO test VALUES (?,?), (?,?)", [1,111,2,222]);
}

// Запрос к тестовой таблице
function requestTestDB(SQLitedb) {
  // Подготовка запроса
  const stmt = SQLitedb.prepare("SELECT * FROM test WHERE col1 BETWEEN $start AND $end");
  stmt.getAsObject({$start:1, $end:1}); // {col1:1, col2:111}

  // Привязка новых значений
  stmt.bind({$start:1, $end:2});
  while(stmt.step()) { //
    const row = stmt.getAsObject();
    console.log('Here is a row: ' + JSON.stringify(row));
  }
}

// Создание таблицы c историей запросов
function createHistoryDB(SQLitedb) {
  // Запрос на создание таблицы
  // CREATE TABLE IF NOT EXISTS TblUsers (UserId INTEGER PRIMARY KEY, UserName varchar(100), ContactName varchar(100),Password varchar(100));
  SQLitedb.run("CREATE TABLE IF NOT EXISTS history (id PRIMARY KEY, Page, Count, Courts, DateFrom, DateTo, Sides, Judges, CaseNumbers, WithVKSInstances);");
  /*
    {
      "Page": 1,
      "Count": 25,
      "Courts": [],
      "DateFrom": null,
      "DateTo": null,
      "Sides": [],
      "Judges": [],
      "CaseNumbers": [
        "А40-172055/2013"
      ],
    "WithVKSInstances": false
  }
  */
  // Запрос на создание двух записей: (1,111) и (2,222)
  //SQLitedb.run("INSERT INTO test VALUES (?,?), (?,?)", [1,111,2,222]);
}

// Функция `initsqls` глобально предоставляется всеми основными дистрибутивами, если они загружены в браузер.
// Мы должны указать эту функцию locateFile, если мы загружаем wasm-файл из любого другого места, кроме папки текущей html-страницы.
let iDB, SQLitedb, binarydb;
initSqlJs(config).then(function(SQL) {
  // Создание базы данных
  SQLitedb = new SQL.Database();

  // Создание тестовой таблицы
  createTestDB(SQLitedb);
  // Запрос к тестовой таблице
  requestTestDB(SQLitedb);
  
  binarydb = SQLitedb.export();
  getCasesDb(cbGetBinary);

  console.log('проверка binarydb:', binarydb);
  if (binarydb === undefined) saveCasesDb(binarydb, cbSaveCasesDB);
  
  if (iniFrame()) {
    // Если окно запущено в iframe
    let origin;

    try { origin = top?.origin } catch (err) { origin = null }

    console.log('origin: ', origin);
    
    if (origin !== null) {
      console.log('top.origin: ', origin);
      if (origin === 'https://kad.arbitr.ru') top.postMessage("сообщение из iframe", 'https://kad.arbitr.ru');
    } else {
      console.log('Окно открыто с тем же origin');
    }
  }
});

/**
 *  IndexedDB
 */ 

// Обратный вызов при сохранении базы данных
function cbSaveCasesDB(db) {
  console.log('casesdb: ', db);
}

// Обратный вызов при получении базы данных
function cbGetCasesDB(db) {
  console.log('casesdb: ', db);
}

// Обратный вызов при получении базы данных
function cbGetBinary(result) {
  console.log(result)
  if (result.length !== 0) {
    console.log('binary: ', result.find(i => i.cbk === 1).database);
  } else {
    console.log('база не получена');
  }
}

// Запрос на открытие базы данных
function openRequestDB(name, version) {
  return window.indexedDB.open(name, version);
}

// Обновление структуры базы данных
function iDBUpgradeNeeded(event) {
  console.log('request: ', event.target);
  console.log('event: ', event);
  console.log('event: ', event);
  // версия существующей базы данных меньше 2 (или база данных не существует)
  iDB = event.target.result; //openRequest.result;
  console.log('event: ', event);      
  switch(event.oldVersion) { // существующая (старая) версия базы данных
    case 0:
      // версия 0 означает, что на клиенте нет базы данных
      // выполнить инициализацию
      if (!iDB.objectStoreNames.contains('cases')) { // если хранилище "cases" не существует
        iDB.createObjectStore('cases', {keyPath: 'cbk'}); // создаём хранилище
      }
    case 1:
      // на клиенте версия базы данных 1
      // обновить
  }
  console.log(iDB.objectStoreNames);
}

// Обработка блокировки базы данных
function iDBBlocked (event) {
  // это событие не должно срабатывать, если мы правильно обрабатываем onversionchange
  // это означает, что есть ещё одно открытое соединение с той же базой данных
  // и он не был закрыт после того, как для него сработал db.onversionchange
  console.log('Сработало событие блокировки. Необходимо закрыть другие вкладки.');
}

// Обработка ошибок
function iDBError (event) {
  console.log('event: ', event);
  console.error("Ошибка загрузки базы данных", openRequest.error);
}

// Обработка открытия базы данных
function iDBOpened (event, func, cb) {
  iDB = event.target.result;
  console.log('iDB: ', iDB);
  iDB.onversionchange = function() {
    iDB.close();
    alert('База данных устарела, пожалуйста, перезагрузите страницу.');
  };
  // ...база данных готова...
  func(iDB, cb);
}

function getAll(iDB, cb) {
  console.log('function getAll');
  const transaction = iDB.transaction("cases", "readwrite"); // (1)
  // получить хранилище объектов для работы с ним
  const cases = transaction.objectStore("cases"); // (2)
  const getAll = cases.getAll();
  getAll.onsuccess = function(e) {
    cb(getAll.result);
  }
  getAll.onerror = function(e) {
    console.log(e);
  }      
}

function DBRequest(
  iDB,                  // IndexedDB
  storeName,            // Имя хранилища
  requestType,          // Тип запроса
  requestParams,        // Параметры запроса
  cb                    // Функция обратного вызова в случае успеха
) {
  const transaction = iDB.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName); // получить хранилище объектов
  const request = store[requestType](requestParams);
  request.onsuccess = (e) => {
    console.log('Запрос "'+requestType+'" выполнен.');
    console.log('Результат запроса: ', e.target.result);
    cb(e.target.result);
  }
}

// здесь должно быть открытие
function getCasesDb(cb) {
  // Открытие IndexedDB
  const openRequest = openRequestDB('casebook{killer}',1);//window.indexedDB.open("casebook{killer}", 1);
  openRequest.onupgradeneeded = (e) => iDBUpgradeNeeded(e); // Обновление структуры базы данных
  openRequest.onblocked = (e) => iDBBlocked(e); // Обработка блокировки
  openRequest.onerror = (e) => iDBError(e); // Обработка ошибок
  openRequest.onsuccess = (e) => {
    iDBOpened(
      e, 
      ()=> DBRequest(iDB,'cases','getAll',undefined,cb), 
      cb
    ); // При успешном открытии
  }
}

// сюда перенести алгоритм сохраения бд
function saveCasesDb(binary, cb) {
  console.log('saveCasesDB: ', binary);
  // Открытие IndexedDB
  const openRequest = openRequestDB('casebook{killer}',1);
  openRequest.onupgradeneeded = (e) => iDBUpgradeNeeded(e); // Обновление структуры базы данных
  openRequest.onblocked = (e) => iDBBlocked(e); // Обработка блокировки
  openRequest.onerror = (e) => iDBError(e); // Обработка ошибок
  openRequest.onsuccess = (e) => {
    console.log('event: ', e);
    iDB = e.target.result;
    iDB.onversionchange = function() {
      iDB.close();
      alert("База данных устарела, пожалуйста, перезагрузите страницу.")
    };
    // ...база данных готова...
    DBRequest(
      iDB, 
      'cases',
      'put',
      {
        cbk: 1, 
        database: binary},
      cb
    );
  };
}
