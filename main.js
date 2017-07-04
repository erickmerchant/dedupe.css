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
        borderWidths: [],
        borderRadii: [],
        widths: [],
        whitespaces: [],
        fontSizes: []
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
        if (node.prop.startsWith('--border-width-')) {
          vars.borderWidths.push(node.prop.substr('--border-width-'.length))
        } else if (node.prop === '--border-width') {
          vars.borderWidths.push(null)
        }
      })

      varTypes.push(function (node) {
        if (node.prop.startsWith('--border-radius-')) {
          vars.borderRadii.push(node.prop.substr('--border-radius-'.length))
        } else if (node.prop === '--border-radius') {
          vars.borderRadii.push(null)
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
        if (node.prop.startsWith('--font-size-')) {
          vars.fontSizes.push(node.prop.substr('--font-size-'.length))
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
        .right { float: right; }
        .left { float: left; }
      `)

      addBreakpointStyles()

      vars.breakpoints.forEach((key) => {
        addBreakpointStyles(key)
      })

      vars.colors.forEach((key) => {
        output.push(outdent`
          .${key} { color: var(--${key}); }
          .background-${key} { background-color: var(--${key}); }
          .border-${key} { border-color: var(--${key}); }
        `)
      })

      output.push(outdent`
        .border {
          border-top-style: solid;
          border-right-style: solid;
          border-bottom-style: solid;
          border-left-style: solid;
        }
        .border-top { border-top-style: solid; }
        .border-right { border-right-style: solid; }
        .border-bottom { border-bottom-style: solid; }
        .border-left { border-left-style: solid; }
      `)

      vars.borderWidths.forEach(function (border) {
        const suffix = border != null ? '-' + border : ''

        output.push(outdent`
          .border${suffix} { border-width: var(--border-width${suffix}); }

          .border${suffix} {
            border-top-width: var(--border-width${suffix});
            border-right-width: var(--border-width${suffix});
            border-bottom-width: var(--border-width${suffix});
            border-left-width: var(--border-width${suffix});
          }
          .border-top${suffix} { border-top-width: var(--border-width${suffix}); }
          .border-right${suffix} { border-right-width: var(--border-width${suffix}); }
          .border-bottom${suffix} { border-bottom-width: var(--border-width${suffix}); }
          .border-left${suffix} { border-left-width: var(--border-width${suffix}); }
        `)
      })

      vars.borderRadii.forEach((key) => {
        const suffix = key != null ? '-' + key : ''

        output.push(outdent`
          .border-radius${suffix} { border-radius: var(--border-radius${suffix}); }
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
          let value = space

          if (![0, 'auto'].includes(space)) {
            value = `var(--whitespace-${space})`
          }

          output.push(outdent`
            .${prefix}margin-${space} {
              margin-top: ${value};
              margin-right: ${value};
              margin-bottom: ${value};
              margin-left: ${value};
            }
            .${prefix}margin-horizontal-${space} {
              margin-right: ${value};
              margin-left: ${value};
            }
            .${prefix}margin-vertical-${space} {
              margin-top: ${value};
              margin-bottom: ${value};
            }
            .${prefix}margin-top-${space} { margin-top: ${value}; }
            .${prefix}margin-right-${space} { margin-right: ${value}; }
            .${prefix}margin-bottom-${space} { margin-bottom: ${value}; }
            .${prefix}margin-left-${space} { margin-left: ${value}; }
          `)
        })

        vars.whitespaces.concat([0]).forEach((space) => {
          let value = space

          if (![0].includes(space)) {
            value = `var(--whitespace-${space})`
          }

          output.push(outdent`
            .${prefix}padding-${space} {
              padding-top: ${value};
              padding-right: ${value};
              padding-bottom: ${value};
              padding-left: ${value};
            }
            .${prefix}padding-horizontal-${space} {
              padding-right: ${value};
              padding-left: ${value};
            }
            .${prefix}padding-vertical-${space} {
              padding-top: ${value};
              padding-bottom: ${value};
            }
            .${prefix}padding-top-${space} { padding-top: ${value}; }
            .${prefix}padding-right-${space} { padding-right: ${value}; }
            .${prefix}padding-bottom-${space} { padding-bottom: ${value}; }
            .${prefix}padding-left-${space} { padding-left: ${value}; }
          `)
        })

        vars.fontSizes.forEach((key) => {
          const suffix = key != null ? '-' + key : ''

          output.push(outdent`
            .${prefix}font-size${suffix} { font-size: var(--font-size${suffix}); }
          `)
        })

        if (key) {
          output.push('}')
        }
      }
    })
  }
})(process.argv.slice(2))
