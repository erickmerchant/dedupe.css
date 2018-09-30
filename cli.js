#!/usr/bin/env node
'use strict'

const command = require('sergeant')
const css = require('./index')
const createWriteStream = require('fs').createWriteStream
const streamPromise = require('stream-to-promise')

command('css', ({ option, parameter }) => {
  parameter('input', {
    description: 'what the input css file is named',
    required: true
  })

  parameter('output', {
    description: 'what the output css file will be named',
    required: true
  })

  return (args) => css({
    writeFile () {
      return streamPromise(createWriteStream(...arguments))
    }
  })(args)
})(process.argv.slice(2))
