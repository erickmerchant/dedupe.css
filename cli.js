#!/usr/bin/env node

import arg from 'arg';
import assert from 'assert';
import childProcess from 'child_process';
import chokidar from 'chokidar';
import {bold, magenta} from 'kleur/colors';
import path from 'path';
import {fileURLToPath} from 'url';

import {compile} from './lib/compile.js';

const usage = `
@erickmerchant/css

${magenta('Usage:')}

 $ css [options]

${magenta('Options:')}

 ${bold('-i <input-file>, --input-file <input-file>')}

  the input

 ${bold('-o <output-directory>, --output-directory <output-directory>')}

  the output directory

 ${bold('-w <directory>, --watch <directory>')}

  watch for changes in <directory>

 ${bold('-d, --dev')}

  throw on missing and add original classes for debugging

 ${bold('-p, --prefix')}

  prepend classes with prefix

 ${bold('-h, --help')}

  display this message

`;

try {
  const args = arg({
    '--watch': String,
    '--input-file': String,
    '--output-directory': String,
    '--prefix': String,
    '--dev': Boolean,
    '--help': Boolean,
    '-i': '--input-file',
    '-o': '--output-directory',
    '-w': '--watch',
    '-p': '--prefix',
    '-d': '--dev',
    '-h': '--help',
  });

  if (args['--help']) {
    console.log(usage);
  } else {
    assert.ok(args._.length === 0, RangeError(`Too many arguments`));

    if (!args['--watch']) {
      args['--input-file'] = path.join(process.cwd(), args['--input-file']);

      await compile(args);
    } else {
      const watcher = chokidar.watch(args['--watch'], {
        ignoreInitial: true,
      });

      const run = async () => {
        const rargs = [
          path.join(path.dirname(fileURLToPath(import.meta.url)), './cli.js'),
          '-i',
          args['--input-file'],
          '-o',
          args['--output-directory'],
        ];

        if (args['--dev']) {
          rargs.push('--dev');
        }

        const spawned = childProcess.spawn(process.execPath, rargs, {
          stdio: 'inherit',
          detached: true,
        });

        spawned.on('error', (err) => {
          console.error(err);
        });
      };

      watcher.on('all', run);

      run();
    }
  }
} catch (error) {
  console.error(error);

  process.exit(1);
}
