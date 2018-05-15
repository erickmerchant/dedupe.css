const test = require('tape')
const execa = require('execa')
const promisify = require('util').promisify
const readFile = promisify(require('fs').readFile)

const noopDefiners = {
  parameter () {},
  option () {}
}

const noopDeps = {
  writeFile (file, content) {

  }
}

test('index.js - options and parameters', function (t) {
  t.plan(4)

  const parameters = {}
  const options = {}

  require('./index')(noopDeps)({
    parameter (name, args) {
      parameters[name] = args
    },
    option (name, args) {
      options[name] = args
    }
  })

  t.ok(parameters.input)

  t.equal(parameters.input.required, true)

  t.ok(parameters.output)

  t.equal(parameters.output.required, true)
})

test('index.js - functionality', async function (t) {
  t.plan(3)

  const expected = await readFile('./fixtures/utilities.css', 'utf-8')

  require('./index')({
    writeFile (file, content) {
      t.equals(file, './fixtures/utilities.css')
      t.equals(content, expected)
    }
  })(noopDefiners)({
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
