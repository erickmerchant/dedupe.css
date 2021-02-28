#!/usr/bin/env node
import {magenta, bold, arg} from 'sergeant'
import action from './index.js'
import path from 'path'
import {fileURLToPath} from 'url'
import childProcess from 'child_process'
import chokidar from 'chokidar'
import assert from 'assert'

const usage = `
@erickmerchant/css

${bold('Usage:')}

 $ ${magenta('css')} [options] <input-js> <output-directory>

${bold('Options:')}

 ${bold('-w <directory>, --watch <directory>')}

  watch for changes in <directory>

 ${bold('-d, --dev')}

  don't minify. throw on missing

 ${bold('-h, --help')}

  display this message

`

const program = async () => {
  try {
    const args = arg({
      '--watch': String,
      '--dev': Boolean,
      '--help': Boolean,
      '-w': '--watch',
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

      await action(args)
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
