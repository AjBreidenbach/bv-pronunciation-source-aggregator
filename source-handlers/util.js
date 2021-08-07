const fs = require('fs').promises

async function testHead(path, regex) {
  let fd
  try {
    fd = await fs.open(path)

    let b = Buffer.alloc(1024)
    await fd.read(b, 0, 1024, 0)
    let head = b.toString('utf8')
    return regex.test(head)
  }
  catch(e) {console.error(e)}
  finally {
    fd && fd.close()
  }
}

module.exports = {testHead}
