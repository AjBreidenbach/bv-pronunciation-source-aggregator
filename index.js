#!/usr/bin/env node

const {program} = require('commander')
const magic = new (require('mmmagic').Magic)()
const tmp = require('tmp-promise')
const tar = require('tar')
const fs = require('fs').promises
const Path = require('path')
const assert = require('assert')
const {readSourceCollections} = require('./source-handlers')
const {openDB} = require ('./db')

program
  .option('-i, --input <inputs...>', 'input source')

program.parse(process.argv)


program.tmpDirs = []

program.processInputs = function () {
  let promises = []

  for (let input of this.opts().input || []) {
    promises.push(processInput(input))
  }

  return Promise.all(promises)

}


function processInput(input) {
  return new Promise(
    (resolve, reject) => {
      magic.detectFile(input, (err, result) => {
        if(err) {
          reject(err)
          return
        }
        let path = input
        let type
        if (result == 'directory') {
          type = result
        } else if (result.includes('tar archive')) {
          type = 'tar'
        }

        assert.ok(type, 'file type not detected')

        resolve({name: Path.basename(input), type, path})

      })
    }
  )
}

async function normalizeInput(input) {
  switch(input.type) {
    case 'tar':
      let o = await tmp.dir()
      this.tmpDirs.push(o.path)
      await tar.x({cwd: o.path, file: input.path})
      let extracted = await fs.readdir(o.path)
      let newPath = o.path

      if(extracted.length == 1) {
        let stat = await fs.stat(Path.join(o.path, extracted[0]))
        if(stat.isDirectory()) newPath = Path.join(o.path, extracted[0])
      }

      return {type: 'directory', path: newPath, name: input.name}

    default: return input
  }

}

program.normalizeInput = normalizeInput.bind(program)


function aggregateSources(db, inputs) {
  let promises = inputs.map(input => 
    readSourceCollections(input)
    .then(collections => Promise.all(collections.map(collection => db.addCollection(collection)))
    )
  )

  return Promise.all(promises)

}

async function main() {
  let inputs = await program.processInputs()
  let output = program.args[0] || 'out.db'
  inputs = await Promise.all(inputs.map(program.normalizeInput))
  let db = await openDB(output)
  await db.begin()
  await aggregateSources(db, inputs)
  await db.commit()
  /*
  for (let input of inputs) {
    let collections = await readSourceCollections(input)
  }
  */


  await Promise.all(program.tmpDirs.map(tmpDir => fs.rm(tmpDir, {recursive: true})))
}

main()


//console.log(program)

