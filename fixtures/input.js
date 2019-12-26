const desktop = '@media (min-width: 100px)'

const bold = {
  'font-weight': 'bold'
}

module.exports = [`
    p {
      margin-top: var(--spacing)
    }
  `, {
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
    // [desktop]: {
    //   'font-size': '5em'
    // },
    background: '#ff8000',
    color: '#111'
  }
}]
