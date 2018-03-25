#!/usr/bin/env node
'use strict'

const command = require('sergeant')
const css = require('./index')
const thenify = require('thenify')
const fs = require('fs')
const writeFile = thenify(fs.writeFile)

command('css', css({writeFile}))(process.argv.slice(2))
