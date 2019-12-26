const test = require('tape')
const execa = require('execa')

test('cli.js', async (t) => {
  t.plan(3)

  try {
    await execa('node', ['./cli.js', '-h'])
  } catch (e) {
    t.ok(e)

    t.equal(e.stdout.includes('Usage'), true)

    t.equal(e.stdout.includes('Options'), true)
  }
})
