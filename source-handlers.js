const fs = require('fs')
const Path = require('path')

let sourceHandlers = []


let handlersDir = Path.join(__dirname, 'source-handlers')

for(let sourceFile of fs.readdirSync(handlersDir)) {
  if(sourceFile == 'util.js') continue
  sourceHandlers.push(require(`./source-handlers/${sourceFile}`))
}


async function readSourceCollections(input) {
  for(let sourceHandler of sourceHandlers) {
    let collections = await sourceHandler(input)
    if(collections) return collections
  }


}

module.exports = {readSourceCollections}
