const test = require('tape')
const execa = require('execa')
const promisify = require('util').promisify
const readFile = promisify(require('fs').readFile)

test('index.js - functionality', async function (t) {
  t.plan(3)

  const expected = await readFile('./fixtures/utilities.css', 'utf-8')

  require('./index')({
    writeFile (file, content) {
      t.equals(file, './fixtures/utilities.css')
      t.equals(content, expected)
    }
  })({
    input: './fixtures/variables.css',
    output: './fixtures/utilities.css'
  })
    .then(function () {
      t.ok(1)
    })
})

test('cli.js', async function (t) {
  t.plan(3)

  try {
    await execa('node', ['./cli.js', '-h'])
  } catch (e) {
    t.ok(e)

    t.equal(e.stderr.includes('Usage'), true)

    t.equal(e.stderr.includes('Parameters'), true)
  }
})
