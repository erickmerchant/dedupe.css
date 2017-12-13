#!/usr/bin/env node
'use strict'

const command = require('sergeant')
const css = require('./index')

command('css', ({option, parameter}) => {
  parameter('input', {
    description: 'what the input css file is named',
    required: true
  })

  parameter('output', {
    description: 'what the output css file will be named',
    required: true
  })

  return css
})(process.argv.slice(2))
