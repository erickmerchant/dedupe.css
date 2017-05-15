#!/usr/bin/env node
'use strict'

const command = require('sergeant')
const path = require('path')
const outdent = require('outdent')
const range = require('lodash.range')
const thenify = require('thenify')
const fsWriteFile = thenify(require('fs').writeFile)

command('css', function ({option, parameter}) {
  parameter('file', {
    description: 'what the outputed css file is named',
    required: true
  })

  return function (args) {
    const css = require(path.join(process.cwd(), 'css.json'))

    const output = []

    if (css.breakpoints && Object.keys(css.breakpoints).length) {
      Object.keys(css.breakpoints).forEach(function (key) {
        let media = []
        let min = css.breakpoints[key][0] || null
        let max = css.breakpoints[key][1] || null

        if (min) {
          media.push(`(width >= ${min}rem)`)
        }

        if (max) {
          media.push(`(width < ${max}rem)`)
        }

        output.push(outdent`
          @custom-media --breakpoint-${key} ${media.join(' and ')};
        `)
      })
    }

    output.push(':root {')

    if (css.colors && Object.keys(css.colors).length) {
      Object.keys(css.colors).forEach(function (key) {
        output.push(outdent`
          --${key}: ${css.colors[key]};
        `)
      })
    }

    if (css.whitespace && Object.keys(css.whitespace).length) {
      Object.keys(css.whitespace).forEach(function (key) {
        output.push(outdent`
          --whitespace-${key}: ${css.whitespace[key]}rem;
        `)
      })
    }

    if (css.type && Object.keys(css.type).length) {
      Object.keys(css.type).forEach(function (key) {
        output.push(outdent`
          --type-${key}: ${css.type[key]}rem;
        `)
      })
    }

    output.push('}')

    addBreakpointStyles()

    if (css.breakpoints && Object.keys(css.breakpoints).length) {
      Object.keys(css.breakpoints).forEach(function (key) {
        addBreakpointStyles(key)
      })
    }

    if (css.colors && Object.keys(css.colors).length) {
      Object.keys(css.colors).forEach(function (key) {
        output.push(outdent`
          .${key} { color: var(--${key}); }
          .background-${key} { background-color: var(--${key}); }
        `)
      })
    }

    if (css.type && Object.keys(css.type).length) {
      Object.keys(css.type).forEach(function (key) {
        output.push(outdent`
          .type-${key} { font-size: var(--type-${key}); }
        `)
      })
    }

    return fsWriteFile(path.join(process.cwd(), args.file), output.join('\n'))

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
      `)

      if (css.widths) {
        range(1, css.widths).forEach(function (width) {
          output.push(outdent`
            .${prefix}width-${width} { width: calc(100% / 3 * ${width}); }
          `)
        })

        output.push(outdent`
          .${prefix}width-${css.widths} { width: 100%; }
        `)
      }

      if (css.whitespace) {
        Object.keys(css.whitespace).concat([0, 'auto']).forEach(function (space) {
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

        Object.keys(css.whitespace).concat([0]).forEach(function (space) {
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
      }

      if (key) {
        output.push('}')
      }
    }
  }
})(process.argv.slice(2))
