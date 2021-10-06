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

  $ css [options] -i <string> -o <string>

${magenta('Options:')}

  --input-file <string>,            
          -i <string>             the input file

  --output-directory <string>,      
                 -o <string>      the output directory 

  --prefix <string>, -p <string>  prepend classes with prefix

  --watch, -w                     watch for changes

  --dev, -d                       throw on missing and add original classes 
                                  for debugging

  --help, -h                      display this message

`;

try {
  const args = arg({
    '--watch': Boolean,
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

    assert.ok(args['--input-file'], '--input-file is required');

    assert.ok(args['--output-directory'], '--output-directory is required');

    if (!args['--watch']) {
      args['--input-file'] = path.join(process.cwd(), args['--input-file']);

      await compile(args);
    } else {
      const watcher = chokidar.watch(path.dirname(args['--input-file']), {
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
