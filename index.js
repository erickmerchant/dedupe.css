const postcss = require('postcss')
const outdent = require('outdent')
const thenify = require('thenify')
const fs = require('fs')
const readFile = thenify(fs.readFile)
const colorRegex = /^((rgb|hsl)a?\([^)]*\)|#[a-f0-9]+|transparent|currentcolor)$/i

module.exports = function (deps) {
  return function ({option, parameter}) {
    parameter('input', {
      description: 'what the input css file is named',
      required: true
    })

    parameter('output', {
      description: 'what the output css file will be named',
      required: true
    })

    return function (args) {
      return readFile(args.input, 'utf8').then(function (input) {
        const processed = postcss().process(input)

        const settings = {
          boxSizing: 'inherit'
        }
        const vars = {
          breakpoints: [],
          colors: [],
          borderWidths: [],
          borderRadii: [],
          widths: [],
          maxWidths: [],
          spacings: [],
          fontSizes: []
        }

        const varTypes = []

        varTypes.push(function (node) {
          if (node.prop === '--box-sizing') {
            settings.boxSizing = node.value === 'false' ? false : node.value
          }
        })

        varTypes.push(function (node) {
          if (colorRegex.test(node.value)) {
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
          } else if (node.prop === '--width') {
            vars.widths.push(null)
          }
        })

        varTypes.push(function (node) {
          if (node.prop.startsWith('--max-width-')) {
            vars.maxWidths.push(node.prop.substr('--max-width-'.length))
          } else if (node.prop === '--max-width') {
            vars.maxWidths.push(null)
          }
        })

        varTypes.push(function (node) {
          if (node.prop.startsWith('--spacing-')) {
            vars.spacings.push(node.prop.substr('--spacing-'.length))
          } else if (node.prop === '--spacing') {
            vars.spacings.push(null)
          }
        })

        varTypes.push(function (node) {
          if (node.prop.startsWith('--font-size-')) {
            vars.fontSizes.push(node.prop.substr('--font-size-'.length))
          } else if (node.prop === '--font-size') {
            vars.fontSizes.push(null)
          }
        })

        processed.result.root.nodes.forEach(function (node) {
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

        if (settings.boxSizing) {
          output.push(outdent`
            *, *::before, *::after { box-sizing: ${settings.boxSizing}; }
          `)
        }

        output.push(outdent`
          .border-box { box-sizing: border-box; }
          .content-box { box-sizing: content-box; }
          .bold { font-weight: bold; }
          .italic { font-style: italic; }
          .underline { text-decoration: underline; }
          .nowrap { white-space: nowrap; }
          .pre { white-space: pre; }
          .normal { white-space: normal; }
          .list-style-none { list-style: none; }
          .overflow-scroll { overflow: scroll; }
          .overflow-hidden { overflow: hidden; }
          .overflow-auto { overflow: auto; }
          .overflow-visible { overflow: visible; }
          .right { float: right; }
          .left { float: left; }
        `)

        addBreakpointStyles()

        vars.breakpoints.forEach(function (key) {
          addBreakpointStyles(key)
        })

        vars.colors.forEach(function (key) {
          output.push(outdent`
            .${key} { color: var(--${key}); }
            .background-${key} { background-color: var(--${key}); }
            .placeholder-${key}::placeholder { color: var(--${key}); }
          `)

          vars.borderWidths.forEach(function (border) {
            const suffix = border != null ? '-' + border : ''

            output.push(outdent`
              .border${suffix}-${key} {
                border-top: var(--border-width${suffix}) solid var(--${key});
                border-right: var(--border-width${suffix}) solid var(--${key});
                border-bottom: var(--border-width${suffix}) solid var(--${key});
                border-left: var(--border-width${suffix}) solid var(--${key});
              }
              .border-top${suffix}-${key} { border-top: var(--border-width${suffix}) solid var(--${key}); }
              .border-right${suffix}-${key} { border-right: var(--border-width${suffix}) solid var(--${key}); }
              .border-bottom${suffix}-${key} { border-bottom: var(--border-width${suffix}) solid var(--${key}); }
              .border-left${suffix}-${key} { border-left: var(--border-width${suffix}) solid var(--${key}); }
            `)
          })
        })

        vars.borderWidths.forEach(function (border) {
          const suffix = border != null ? '-' + border : ''

          output.push(outdent`
            .border${suffix} {
              border-top: var(--border-width${suffix}) solid currentColor;
              border-right: var(--border-width${suffix}) solid currentColor;
              border-bottom: var(--border-width${suffix}) solid currentColor;
              border-left: var(--border-width${suffix}) solid currentColor;
            }
            .border-top${suffix} { border-top: var(--border-width${suffix}) solid currentColor; }
            .border-right${suffix} { border-right: var(--border-width${suffix}) solid currentColor; }
            .border-bottom${suffix} { border-bottom: var(--border-width${suffix}) solid currentColor; }
            .border-left${suffix} { border-left: var(--border-width${suffix}) solid currentColor; }
          `)
        })

        vars.borderRadii.forEach(function (key) {
          const suffix = key != null ? '-' + key : ''

          output.push(outdent`
            .border-radius${suffix} {
              border-top-left-radius: var(--border-radius${suffix});
              border-top-right-radius: var(--border-radius${suffix});
              border-bottom-left-radius: var(--border-radius${suffix});
              border-bottom-right-radius: var(--border-radius${suffix});
            }
            .border-left-radius${suffix} {
              border-top-left-radius: var(--border-radius${suffix});
              border-bottom-left-radius: var(--border-radius${suffix});
            }
            .border-right-radius${suffix} {
              border-top-right-radius: var(--border-radius${suffix});
              border-bottom-right-radius: var(--border-radius${suffix});
            }
            .border-top-radius${suffix} {
              border-top-left-radius: var(--border-radius${suffix});
              border-top-right-radius: var(--border-radius${suffix});
            }
            .border-bottom-radius${suffix} {
              border-bottom-left-radius: var(--border-radius${suffix});
              border-bottom-right-radius: var(--border-radius${suffix});
            }
            .border-top-left-radius${suffix} {
              border-top-left-radius: var(--border-radius${suffix});
            }
            .border-top-right-radius${suffix} {
              border-top-right-radius: var(--border-radius${suffix});
            }
            .border-bottom-left-radius${suffix} {
              border-bottom-left-radius: var(--border-radius${suffix});
            }
            .border-bottom-right-radius${suffix} {
              border-bottom-right-radius: var(--border-radius${suffix});
            }
          `)
        })

        return deps.writeFile(args.output, output.concat('').join('\n'))

        function addBreakpointStyles (key) {
          if (key) {
            output.push(`@media (--breakpoint-${key}) {`)
          }

          let prefix = key ? key + '-' : ''

          output.push(outdent`
            .${prefix}flex { display: flex;  }
            .${prefix}inline-flex { display: inline-flex;  }
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
            .${prefix}inline { display: inline; }
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
            .${prefix}align-center { text-align: center; }
            .${prefix}align-left { text-align: left; }
            .${prefix}align-right { text-align: right; }
          `)

          vars.widths.forEach(function (width) {
            const suffix = width != null ? '-' + width : ''

            output.push(outdent`
              .${prefix}width${suffix} { width: var(--width${suffix}); }
            `)
          })

          vars.maxWidths.forEach(function (width) {
            const suffix = width != null ? '-' + width : ''

            output.push(outdent`
              .${prefix}max-width${suffix} { max-width: var(--max-width${suffix}); }
            `)
          })

          vars.spacings.concat([0, 'auto']).forEach(function (space) {
            let value = space
            const suffix = space != null ? '-' + space : ''

            if (![0, 'auto'].includes(space)) {
              value = `var(--spacing${suffix})`
            }

            output.push(outdent`
              .${prefix}margin${suffix} {
                margin-top: ${value};
                margin-right: ${value};
                margin-bottom: ${value};
                margin-left: ${value};
              }
              .${prefix}margin-horizontal${suffix} {
                margin-right: ${value};
                margin-left: ${value};
              }
              .${prefix}margin-vertical${suffix} {
                margin-top: ${value};
                margin-bottom: ${value};
              }
              .${prefix}margin-top${suffix} { margin-top: ${value}; }
              .${prefix}margin-right${suffix} { margin-right: ${value}; }
              .${prefix}margin-bottom${suffix} { margin-bottom: ${value}; }
              .${prefix}margin-left${suffix} { margin-left: ${value}; }
            `)
          })

          vars.spacings.concat([0]).forEach(function (space) {
            let value = space
            const suffix = space != null ? '-' + space : ''

            if (![0].includes(space)) {
              value = `var(--spacing${suffix})`
            }

            output.push(outdent`
              .${prefix}padding${suffix} {
                padding-top: ${value};
                padding-right: ${value};
                padding-bottom: ${value};
                padding-left: ${value};
              }
              .${prefix}padding-horizontal${suffix} {
                padding-right: ${value};
                padding-left: ${value};
              }
              .${prefix}padding-vertical${suffix} {
                padding-top: ${value};
                padding-bottom: ${value};
              }
              .${prefix}padding-top${suffix} { padding-top: ${value}; }
              .${prefix}padding-right${suffix} { padding-right: ${value}; }
              .${prefix}padding-bottom${suffix} { padding-bottom: ${value}; }
              .${prefix}padding-left${suffix} { padding-left: ${value}; }
            `)
          })

          vars.fontSizes.forEach(function (key) {
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
  }
}
