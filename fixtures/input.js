const desktop = '@media (min-width: 100px)'

const bold = {
  'font-weight': 'bold'
}

module.exports = {
  _before: `
    p {
      margin-top: var(--spacing)
    }
  `,
  loud: {
    ...bold,
    [desktop]: {
      'font-size': '5em'
    },
    '::after': {
      content: '!'
    }
  },
  button: {
    ...bold,
    background: '#ff8000',
    color: '#111'
  }
}
