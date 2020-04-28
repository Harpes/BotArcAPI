// filename : corefunc/database.js
// author   : TheSnowfield
// date     : 04/09/2020
// comment  : initialize databases and preare datatable

const TAG = 'corefunc/database.js';

const file = require('fs');
const database = require('sqlite-async');

const dbproc_arcaccount_init = require('../procedures/arcaccount_init');
const dbproc_arcaccount_all = require('../procedures/arcaccount_all');
const dbproc_arcbest30_init = require('../procedures/arcbest30_init');
const dbproc_arcrecord_init = require('../procedures/arcrecord_init');
const dbproc_arcplayer_init = require('../procedures/arcplayer_init');
const dbproc_arcsong_init = require('../procedures/arcsong_init');
const _dbproc_arcsong_update_from_songlist = require('../procedures/arcsong_update_from_songlist');

const initDataBases = () => {

  // create folder first
  if (!file.existsSync(DATABASE_PATH))
    file.mkdirSync(DATABASE_PATH);

  //////////////////////////////////////////////////////////////////////////
  // database for arcaea accounts                                         //
  //////////////////////////////////////////////////////////////////////////
  const _database_arcaccount = 'arcaccount.db';
  const _path_database_arcaccount = `${DATABASE_PATH}/${_database_arcaccount}`;
  syslog.v(TAG, `Opening database => ${_path_database_arcaccount}`);

  database.open(_path_database_arcaccount, database.OPEN_READWRITE | database.OPEN_CREATE)
    .then((link) => {
      Object.defineProperty(global, 'DATABASE_ARCACCOUNT',
        { value: link, writable: false, configurable: false });
      Object.freeze(DATABASE_ARCACCOUNT);
    })
    .then(async () => { await dbproc_arcaccount_init(); })
    .then(() => {
      syslog.v(TAG, `${_database_arcaccount} => Loading arc accounts from database`);

      // preload all arc account to queue
      dbproc_arcaccount_all()
        .then((result) => {

          // no arc account in the database
          if (!result.length) {
            syslog.w(TAG, `${_database_arcaccount} => There\'s no arc account in the database`);
            syslog.w(TAG, `${_database_arcaccount} => You must add ATLEAST ONE account to the database`);
          }
          // map to global space
          // and pretended to be a queue
          // so no need to freeze this object
          Object.defineProperty(global, 'ARCACCOUNT',
            { value: result, writable: true, configurable: false });

          // token list for persistent querying
          Object.defineProperty(global, 'ARCPERSISTENT',
            { value: [], writable: true, configurable: false });

          // verbose output
          for (let i = 0; i < result.length; ++i)
            syslog.v(TAG, `${_database_arcaccount} => ${result[i].name} ${result[i].token}`);
          syslog.i(TAG, `${_database_arcaccount} => Arc account(s) loaded: ${result.length}`);
        })
        .then(() => { syslog.i(TAG, `${_database_arcaccount} => OK`); })
        .catch((e) => { reject(e) });
    })
    .catch((e) => { syslog.f(TAG, `${_database_arcaccount} => ${e.toString()}`); });


  //////////////////////////////////////////////////////////////////////////
  // database for arcaea best30 cache                                     //
  //////////////////////////////////////////////////////////////////////////
  const _database_arcbest30 = 'arcbest30.db';
  const _path_database_arcbest30 = `${DATABASE_PATH}/${_database_arcbest30}`;
  syslog.v(TAG, `Opening database => ${_path_database_arcbest30}`);

  database.open(_path_database_arcbest30, database.OPEN_READWRITE | database.OPEN_CREATE)
    .then((link) => {
      Object.defineProperty(global, 'DATABASE_ARCBEST30',
        { value: link, writable: false, configurable: false });
      Object.freeze(DATABASE_ARCBEST30);
    })
    .then(async () => { await dbproc_arcbest30_init(); })
    .then(() => { syslog.i(TAG, `${_database_arcbest30} => OK`); })
    .catch((e) => { syslog.f(TAG, `${_database_arcbest30} => ${e.toString()}`); });


  //////////////////////////////////////////////////////////////////////////
  // database for arcaea player's info                                    //
  //////////////////////////////////////////////////////////////////////////
  const _database_arcplayer = 'arcplayer.db';
  const _path_database_arcplayer = `${DATABASE_PATH}/${_database_arcplayer}`;
  syslog.v(TAG, `Opening database => ${_path_database_arcplayer}`);

  database.open(_path_database_arcplayer, database.OPEN_READWRITE | database.OPEN_CREATE)
    .then((link) => {
      Object.defineProperty(global, 'DATABASE_ARCPLAYER',
        { value: link, writable: false, configurable: false });
      Object.freeze(DATABASE_ARCPLAYER);
    })
    .then(async () => { await dbproc_arcplayer_init(); })
    .then(() => { syslog.i(TAG, `${_database_arcplayer} => OK`); })
    .catch((e) => { syslog.f(TAG, `${_database_arcplayer} => ${e.toString()}`); });


  //////////////////////////////////////////////////////////////////////////
  // database for arcaea player's record                                  //
  //////////////////////////////////////////////////////////////////////////
  const _database_arcrecord = 'arcrecord.db';
  const _path_database_arcrecord = `${DATABASE_PATH}/${_database_arcrecord}`
  syslog.v(TAG, `Opening database => ${_path_database_arcrecord}`);

  database.open(_path_database_arcrecord, database.OPEN_READWRITE | database.OPEN_CREATE)
    .then((link) => {
      Object.defineProperty(global, 'DATABASE_ARCRECORD',
        { value: link, writable: false, configurable: false });
      Object.freeze(DATABASE_ARCRECORD);
    })
    .then(async () => { await dbproc_arcrecord_init(); })
    .then(() => { syslog.i(TAG, `${_database_arcrecord} => OK`); })
    .catch((e) => { syslog.f(TAG, `${_database_arcrecord} => ${e.toString()}`); });


  //////////////////////////////////////////////////////////////////////////
  // database for arcaea songs                                            //
  //////////////////////////////////////////////////////////////////////////
  const _database_arcsong = 'arcsong.db';
  const _path_database_arcsong = `${DATABASE_PATH}/${_database_arcsong}`
  syslog.v(TAG, `Opening database => ${_path_database_arcsong}`);

  database.open(_path_database_arcsong, database.OPEN_READWRITE | database.OPEN_CREATE)
    .then((link) => {
      Object.defineProperty(global, 'DATABASE_ARCSONG',
        { value: link, writable: false, configurable: false });
      Object.freeze(DATABASE_ARCSONG);
    })
    .then(async () => { await dbproc_arcsong_init(); })
    .then(async () => {

      // read song informations into database
      // if songlist exists
      const _path_to_songlist = `${DATABASE_PATH}/songlist`;
      if (file.existsSync(_path_to_songlist)) {
        syslog.i(TAG, 'songlist file detected... updating database');

        await file.promises.readFile(_path_to_songlist)
          .then(async (file) => {
            let root = null;

            // try parse songlist file
            try {
              root = JSON.parse(file);
            } catch (e) { throw e; }

            // update database
            await _dbproc_arcsong_update_from_songlist(root);
          })
          .catch((e) => { throw e; });
      }
    })
    .then(() => { syslog.i(TAG, `${_database_arcsong} => OK`); })
    .catch((e) => { syslog.f(TAG, `${_database_arcsong} => ${e.toString()}`); });

}

const close = () => {
  try {
    DATABASE_ARCACCOUNT.close();
    DATABASE_ARCBEST30.close();
    DATABASE_ARCPLAYER.close();
    DATABASE_ARCRECORD.close();
    DATABASE_ARCSONG.close();
  } catch (e) { /* do nothing */ }
}

// exports
module.exports.close = close;
module.exports.initDataBases = initDataBases;
