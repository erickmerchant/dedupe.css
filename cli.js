#!/usr/bin/env node
import arg from 'arg'
import {magenta, bold} from 'kleur/colors'
import action from './index.js'
import path from 'path'
import {fileURLToPath} from 'url'
import childProcess from 'child_process'
import chokidar from 'chokidar'

const usage = `
@erickmerchant/css

${bold('Usage:')}

 $ ${magenta('css')} [options] <input> <output>

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
      '-h': '--help',

      // undocumented
      '--no-optimize': Boolean
    })

    if (args['--help']) {
      process.stdout.write(usage)

      process.exit(2)
    }

    if (args._.length < 2) {
      throw RangeError('too few arguments')
    }

    if (args._.length > 2) {
      throw RangeError('too many arguments')
    }

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
    process.stderr.write(`${error}\n`)

    process.exit(1)
  }
}

program()
