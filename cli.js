#!/usr/bin/env node
import assert from 'assert'
import childProcess from 'child_process'
import chokidar from 'chokidar'
import path from 'path'
import {arg, bold, magenta} from 'sergeant'
import {fileURLToPath} from 'url'

import {compile} from './lib/compile.js'

const usage = `
@erickmerchant/css

${bold('Usage:')}

 $ ${magenta('css')} [options] <input-js> <output-directory>

${bold('Options:')}

 ${bold('-w <directory>, --watch <directory>')}

  watch for changes in <directory>

 ${bold('-d, --dev')}

  throw on missing and add original classes for debugging

 ${bold('-p, --prefix')}

  prepend classes with prefix

 ${bold('-h, --help')}

  display this message

`

const program = async () => {
  try {
    const args = arg({
      '--watch': String,
      '--prefix': String,
      '--dev': Boolean,
      '--help': Boolean,
      '-w': '--watch',
      '-p': '--prefix',
      '-d': '--dev',
      '-h': '--help'
    })

    if (args['--help']) {
      console.log(usage)

      return
    }

    assert.ok(
      args._.length === 2,
      RangeError(`too ${args._.length > 2 ? 'many' : 'few'} arguments`)
    )

    const [input, output] = args._

    args.input = input

    args.output = output

    if (!args['--watch']) {
      args.input = path.join(process.cwd(), args.input)

      await compile(args)
    } else {
      const watcher = chokidar.watch(args['--watch'], {ignoreInitial: true})

      const run = async () => {
        const rargs = [
          path.join(path.dirname(fileURLToPath(import.meta.url)), './cli.js'),
          args.input,
          args.output
        ]

        if (args['--dev']) {
          rargs.push('--dev')
        }

        const spawned = childProcess.spawn(process.execPath, rargs, {
          stdio: 'inherit',
          detached: true
        })

        spawned.on('error', (err) => {
          console.error(err)
        })
      }

      watcher.on('all', run)

      run()
    }
  } catch (error) {
    console.error(error)

    process.exit(1)
  }
}

program()
