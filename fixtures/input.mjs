const desktop = '@media (min-width: 100px)'
const grid = '@supports (display: grid)'

const emphasis = `
  font-weight: normal;
  font-weight: bold;
  font-style: italic;
`

export const _start = `
  p {
    margin-top: var(--spacing)
  }

  .a {
    padding: 1em;
  }
`

export const styles = {
  loud: `
    ${emphasis}
    ${desktop} {
      font-size: 5em;

      ::after {
        content: '!!'
      }
    }
    ::after {
      content: '!'
    }
  `,
  button: `
    ${emphasis}
    background-color: #ff8000;
    color: #111;
  `,
  grid: `
    ${desktop} {
      ${grid} {
        display: grid;
      }

      display: flex;
    }
  `
}
