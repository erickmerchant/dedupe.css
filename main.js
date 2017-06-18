#!/usr/bin/env node
'use strict'

const command = require('sergeant')
const postcss = require('postcss')
const path = require('path')
const outdent = require('outdent')
const thenify = require('thenify')
const fs = require('fs')
const readFile = thenify(fs.readFile)
const writeFile = thenify(fs.writeFile)

command('css', ({option, parameter}) => {
  parameter('input', {
    description: 'what the input css file is named',
    required: true
  })

  parameter('output', {
    description: 'what the output css file will be named',
    required: true
  })

  return (args) => {
    return readFile(args.input, 'utf8').then((input) => {
      const processed = postcss().process(input)

      const vars = {
        breakpoints: [],
        colors: [],
        widths: [],
        whitespaces: [],
        typesizes: []
      }

      const varTypes = []

      varTypes.push(function (node) {
        if (node.value.startsWith('#') ||
         node.value.startsWith('hsl(') ||
         node.value.startsWith('hsla(') ||
         node.value.startsWith('rgb(') ||
         node.value.startsWith('rgba(')
       ) {
          vars.colors.push(node.prop.substr(2))
        }
      })

      varTypes.push(function (node) {
        if (node.prop.startsWith('--width-')) {
          vars.widths.push(node.prop.substr('--width-'.length))
        }
      })

      varTypes.push(function (node) {
        if (node.prop.startsWith('--whitespace-')) {
          vars.whitespaces.push(node.prop.substr('--whitespace-'.length))
        }
      })

      varTypes.push(function (node) {
        if (node.prop.startsWith('--typesize-')) {
          vars.typesizes.push(node.prop.substr('--typesize-'.length))
        }
      })

      processed.result.root.nodes.forEach((node) => {
        if (node.selector === ':root') {
          node.nodes
            .filter((node) => node.type === 'decl')
            .forEach((node) => varTypes.forEach((varType) => varType(node)))
        } else if (node.name === 'custom-media') {
          const match = node.params.match(/^--breakpoint-([a-z-]+)/)

          if (match != null && match[1] != null) {
            vars.breakpoints.push(match[1])
          }
        }
      })

      const output = []
      const varImport = './' + path.join(path.relative(path.dirname(args.output), path.dirname(args.input)), path.basename(args.input))

      output.push(`@import "${varImport}";`)

      output.push(outdent`
        *, *:before, *:after { box-sizing: inherit; }
        .border-box { box-sizing: border-box; }
        .content-box { box-sizing: content-box; }
        .bold { font-weight: bold; }
        .italic { font-style: italic; }
      `)

      addBreakpointStyles()

      vars.breakpoints.forEach((key) => {
        addBreakpointStyles(key)
      })

      vars.colors.forEach((key) => {
        output.push(outdent`
          .${key} { color: var(--${key}); }
          .background-${key} { background-color: var(--${key}); }
        `)
      })

      return writeFile(path.join(process.cwd(), args.output), output.join('\n'))

      function addBreakpointStyles (key) {
        if (key) {
          output.push(`@media (--breakpoint-${key}) {`)
        }

        let prefix = key ? key + '-' : ''

        output.push(outdent`
          .${prefix}flex { display: flex;  }
          .${prefix}auto { flex: 1 1 auto;  }
          .${prefix}row { flex-direction: row; }
          .${prefix}row-reverse { flex-direction: row-reverse; }
          .${prefix}column { flex-direction: column; }
          .${prefix}column-reverse { flex-direction: column-reverse; }
          .${prefix}wrap { flex-wrap: wrap; }
          .${prefix}wrap-reverse { flex-wrap: wrap-reverse; }
          .${prefix}justify-around { justify-content: space-around; }
          .${prefix}justify-between { justify-content: space-between; }
          .${prefix}justify-start { justify-content: flex-start; }
          .${prefix}justify-end { justify-content: flex-end; }
          .${prefix}justify-center { justify-content: center; }
          .${prefix}items-stretch { align-items: stretch; }
          .${prefix}items-start { align-items: flex-start; }
          .${prefix}items-end { align-items: flex-end; }
          .${prefix}items-center { align-items: center; }
          .${prefix}items-baseline { align-items: baseline; }
          .${prefix}content-around { align-content: space-around; }
          .${prefix}content-between { align-content: space-between; }
          .${prefix}content-start { align-content: flex-start; }
          .${prefix}content-end { align-content: flex-end; }
          .${prefix}content-center { align-content: center; }
          .${prefix}content-stretch { align-content: stretch; }
          .${prefix}self-stretch { align-self: stretch; }
          .${prefix}self-start { align-self: flex-start; }
          .${prefix}self-end { align-self: flex-end; }
          .${prefix}self-center { align-self: center; }
          .${prefix}self-baseline { align-self: baseline; }
          .${prefix}inline-block { display: inline-block; }
          .${prefix}block { display: block; }
          .${prefix}none { display: none; }
          .${prefix}relative { position: relative; }
          .${prefix}absolute { position: absolute; }
          .${prefix}fixed { position: fixed; }
          .${prefix}top-0 { top: 0; }
          .${prefix}right-0 { right: 0; }
          .${prefix}bottom-0 { bottom: 0; }
          .${prefix}left-0 { left: 0; }
          .${prefix}fit-width { max-width: 100%; }
          .${prefix}full-width { width: 100%; }
          .${prefix}center { text-align: center; }
          .${prefix}left { text-align: left; }
          .${prefix}right { text-align: right; }
        `)

        vars.widths.forEach(function (width) {
          output.push(outdent`
            .${prefix}width-${width} { width: var(--width-${width}); }
          `)
        })

        vars.whitespaces.concat([0, 'auto']).forEach((space) => {
          output.push(outdent`
            .${prefix}margin-${space} {
              margin-top: var(--whitespace-${space});
              margin-right: var(--whitespace-${space});
              margin-bottom: var(--whitespace-${space});
              margin-left: var(--whitespace-${space});
            }
            .${prefix}margin-horizontal-${space} {
              margin-right: var(--whitespace-${space});
              margin-left: var(--whitespace-${space});
            }
            .${prefix}margin-vertical-${space} {
              margin-top: var(--whitespace-${space});
              margin-bottom: var(--whitespace-${space});
            }
            .${prefix}margin-top-${space} { margin-top: var(--whitespace-${space}); }
            .${prefix}margin-right-${space} { margin-right: var(--whitespace-${space}); }
            .${prefix}margin-bottom-${space} { margin-bottom: var(--whitespace-${space}); }
            .${prefix}margin-left-${space} { margin-left: var(--whitespace-${space}); }
          `)
        })

        vars.whitespaces.concat([0]).forEach((space) => {
          output.push(outdent`
            .${prefix}padding-${space} {
              padding-top: var(--whitespace-${space});
              padding-right: var(--whitespace-${space});
              padding-bottom: var(--whitespace-${space});
              padding-left: var(--whitespace-${space});
            }
            .${prefix}padding-horizontal-${space} {
              padding-right: var(--whitespace-${space});
              padding-left: var(--whitespace-${space});
            }
            .${prefix}padding-vertical-${space} {
              padding-top: var(--whitespace-${space});
              padding-bottom: var(--whitespace-${space});
            }
            .${prefix}padding-top-${space} { padding-top: var(--whitespace-${space}); }
            .${prefix}padding-right-${space} { padding-right: var(--whitespace-${space}); }
            .${prefix}padding-bottom-${space} { padding-bottom: var(--whitespace-${space}); }
            .${prefix}padding-left-${space} { padding-left: var(--whitespace-${space}); }
          `)
        })

        vars.typesizes.forEach((key) => {
          output.push(outdent`
            .${prefix}typesize-${key} { font-size: var(--typesize-${key}); }
          `)
        })

        if (key) {
          output.push('}')
        }
      }
    })
  }
})(process.argv.slice(2))
