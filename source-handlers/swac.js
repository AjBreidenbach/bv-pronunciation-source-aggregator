const fs = require('fs')
const Path = require('path')
const sourceUtil = require('./util')
const XmlParser = require('htmlparser2').Parser


const DOCTYPE_REGEX = /<!DOCTYPE.*"https?:\/\/shtooka\.net\/project\/swac\/index\.dtd">/i

module.exports = async function(input) {
  if (input.type != 'directory') return


  let indexPath = Path.join(input.path, 'index.xml')

  let isSwac = await sourceUtil.testHead(indexPath, DOCTYPE_REGEX)
  if (!isSwac) return


  let collections = await parseSwac(indexPath)


  return collections

   
}


function parseSwac(path) {
  return new Promise((resolve, reject) => {
    let collections = []

    let currentGroup
    let currentFile
    let currentTag
    let dir = Path.dirname(path)


    function openGroup(attributes) {
      currentGroup = {
        authors: attributes.swac_coll_authors,
        copyright: attributes.swac_coll_copyright,
        license: attributes.swac_coll_license,
        name: attributes.swac_coll_name,
        org: attributes.swac_coll_org,
        url: attributes.swac_coll_url,
        lang: attributes.swac_lang,
        entries: []
      }
    }

    function openFile(attributes) {
      currentFile = attributes.path
    }

    function openTag(attributes) {
      currentTag = attributes.swac_text
    }


    function closeGroup() {
      collections.push(currentGroup)
    }

    function closeFile() {
      currentGroup.entries.push({
        audio: Path.join(dir, currentFile),
        text: currentTag
      })
    }

    let parser = new XmlParser(
      {
        onopentag(name, attributes) {
          switch(name) {
            case 'group':
              openGroup(attributes)
              break
            case 'file':
              openFile(attributes)
              break
            case 'tag':
              openTag(attributes)
          }
        },

        onclosetag(name) {
          switch(name) {
            case 'group':
              closeGroup()
              break
            case 'file':
              closeFile()
          }
        }
      },
      { xmlMode: true }
    )


    let index = fs.createReadStream(path)
    

    let parserWrite = parser.write.bind(parser)

    function parserEnd() {
      parser.end()
      resolve(collections)
    }

    index.on('data', parserWrite)
    index.on('end', parserEnd)


  })
}
