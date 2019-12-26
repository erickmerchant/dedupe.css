#!/usr/bin/env node
'use strict'

const {command, start} = require('sergeant')('css')
const action = require('./index')

command({
  signature: ['input', 'output'],
  options: {
    input: {
      description: 'what the input js file is named',
      required: true,
      parameter: true
    },
    output: {
      description: 'what the output css and js files will be named',
      required: true,
      parameter: true
    }
  },
  action
})

start(process.argv.slice(2))
