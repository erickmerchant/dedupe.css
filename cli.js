#!/usr/bin/env node
import arg from 'arg'
import {magenta, bold} from 'kleur/colors'
import action from './index.js'

const usage = `
@erickmerchant/css

${bold('Usage:')}

 $ ${magenta('css')} [options] -- <input> <output>

${bold('Options:')}

 -w, --watch  watch for changes
 -d, --dev    don't minify. throw on missing
 -h, --help   display this message

`

const program = async () => {
  try {
    const args = arg({
      '--watch': Boolean,
      '--dev': Boolean,
      '--help': Boolean,
      '-w': '--watch',
      '-d': '--dev',
      '-h': '--help'
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

    Object.assign(args, {input, output})

    await action(args)
  } catch (error) {
    process.stderr.write(`${error}\n`)

    process.exit(1)
  }
}

program()
