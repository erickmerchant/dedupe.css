const desktop = '@media (min-width: 100px)'

const emphasis = {
  'font-weight': 'bold',
  'font-style': 'italic'
}

module.exports = {
  _before: `
    p {
      margin-top: var(--spacing)
    }
  `,
  loud: {
    ...emphasis,
    [desktop]: {
      'font-size': '5em'
    },
    '::after': {
      content: '!'
    }
  },
  button: {
    ...emphasis,
    background: '#ff8000',
    color: '#111'
  }
}
