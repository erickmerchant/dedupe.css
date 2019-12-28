# @erickmerchant/css

css from js. atomic styles

``` js
// input.js

const desktop = '@media (min-width: 100px)'

const bold = `
  font-weight: bold;
`

module.exports = {
  _before: `
    p {
      margin-top: var(--spacing)
    }
  `,
  loud: `
    ${bold}
    ${desktop} {
      font-size: 5em;
    }
    ::after {
      content: '!';
    }
  `,
  button: `
    ${bold}
    background: #ff8000;
    color: #111;
  `
}
```

``` css
/* output.css */

p {
  margin-top: var(--spacing)
}

.a {
  font-weight: bold
}

.b::after {
  content: '!'
}

.c {
  background: #ff8000;
  color: #111;
}

@media (min-width: 100px) {
  .b {
    font-size: 5em;
  }
}
```

``` mjs
// output.mjs

export const classes = {
  loud: 'a b',
  button: 'a c'
}
```

``` mjs
// app.mjs

import {classes} from './output.mjs'

classes.loud // 'a b'

classes.button // 'a c'
```

## usage

build once

```
css input.js -o output
```

watch for changes

```
css -w input.js -o output
```
