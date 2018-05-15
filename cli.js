#!/usr/bin/env node
'use strict'

const command = require('sergeant')
const css = require('./index')
const promisify = require('util').promisify
const fs = require('fs')
const writeFile = promisify(fs.writeFile)

command('css', css({writeFile}))(process.argv.slice(2))
