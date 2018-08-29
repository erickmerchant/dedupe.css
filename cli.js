#!/usr/bin/env node
'use strict'

const command = require('sergeant')
const css = require('./index')
const promisify = require('util').promisify
const fs = require('fs')
const writeFile = promisify(fs.writeFile)

command('css', ({ option, parameter }) => {
  parameter('input', {
    description: 'what the input css file is named',
    required: true
  })

  parameter('output', {
    description: 'what the output css file will be named',
    required: true
  })

  return (args) => css({ writeFile })(args)
})(process.argv.slice(2))
