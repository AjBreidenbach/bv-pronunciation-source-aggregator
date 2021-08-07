const Path = require('path')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const fs = require('fs').promises

const LANGUAGE_CODES = JSON.parse(require('fs').readFileSync(Path.join(__dirname, 'language-codes-full_json.json'), {encoding: 'utf8'}))


function convertToISO6391(code) {
  if (code.length == 2) {
    if(LANGUAGE_CODES.some(lang => lang.alpha2 == code))
      return code
  }
  if (code.length == 3) {
    let lang = LANGUAGE_CODES.find(lang => lang['alpha3-b'] == code)
    return lang.alpha2
  }

}

class Model {
  constructor(dbInstance) {
    this.db = dbInstance
  }

  async addCollection(collection) {
    let {entries, authors, copyright, license, name, org, url, lang} = collection
    let result = await this.db.run(
      `insert into collections (authors, copyright, license, name, org, url, lang)
      values (?, ?, ?, ?, ?, ?, ?)
      `, authors, copyright, license, name, org, url, convertToISO6391(lang)
    )

    let promises = []

    for (let entry of entries) {
      let {audio, text} = entry

      promises.push(fs.readFile(audio)
      .then(audio => {
        this.db.run(
          'insert into entries (collectionURL, text, audio) values (?,?,?)',
          url, text, audio
        )
      }))
    }

    await Promise.all(promises)

  }

  begin(){
    return this.db.exec('BEGIN')
  }

  commit() {
    return this.db.exec('COMMIT')
  }
}

async function openDB(filename) {


  let dbInstance = await open({filename, driver: sqlite3.Database})
  await dbInstance.exec(`
  create table if not exists collections (
    id integer primary key autoincrement,
    authors text,
    copyright text,
    license text,
    name text,
    org text,
    url text,
    lang char(2)
  )
  `)


  await dbInstance.exec(`
  create table if not exists entries (
    id integer primary key autoincrement,
    collectionURL text,
    text text,
    audio blob
  )
  `)
  return new Model(dbInstance)
}

module.exports = {openDB}
