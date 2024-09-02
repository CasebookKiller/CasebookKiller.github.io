// Проверка IndexedDB
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

config = {
  locateFile: filename => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.11.0/${filename}`
}

// Функция `initsqls` глобально предоставляется всеми основными дистрибутивами, если они загружены в браузер.
// Мы должны указать эту функцию locateFile, если мы загружаем wasm-файл из любого другого места, кроме папки текущей html-страницы.
let iDB, SQLitedb, binarydb;
initSqlJs(config).then(function(SQL){
  // Создание базы данных
  SQLitedb = new SQL.Database();
  // Запрос на создание таблицы
  SQLitedb.run("CREATE TABLE test (col1, col2);");
  // Запрос на создание двух записей: (1,111) и (2,222)
  SQLitedb.run("INSERT INTO test VALUES (?,?), (?,?)", [1,111,2,222]);

  // Подготовка запроса
  const stmt = SQLitedb.prepare("SELECT * FROM test WHERE col1 BETWEEN $start AND $end");
  stmt.getAsObject({$start:1, $end:1}); // {col1:1, col2:111}

  // Привязка новых значений
  stmt.bind({$start:1, $end:2});
  while(stmt.step()) { //
    const row = stmt.getAsObject();
    console.log('Here is a row: ' + JSON.stringify(row));
  }
  binarydb = SQLitedb.export();
  getCasesDb(cbGetBinary);
  if (binarydb === undefined) saveCasesDb(binarydb, cbSaveCasesDB);
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
