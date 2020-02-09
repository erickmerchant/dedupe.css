#!/usr/bin/env node
'use strict'

const {command, start} = require('sergeant')('css')
const action = require('./index')

command({
  signature: ['input', 'output'],
  options: {
    watch: {
      description: 'watch for changes'
    },
    w: 'watch',
    input: {
      description: 'what the input js file is named',
      required: true,
      parameter: true
    },
    i: 'input',
    output: {
      description: 'what the output css and js files will be named without extension',
      required: true,
      parameter: true
    },
    o: 'output',
    dev: {
      description: 'run in dev mode'
    },
    d: 'dev'
  },
  action
})

start(process.argv.slice(2))
