# @erickmerchant/css

css from js. atomic styles

``` js
// input.js
const desktop = '@media (min-width: 100px)'

const emphasis = `
  font-weight: normal;
  font-weight: bold;
  font-style: italic;
`

export default {
  _before: `
    p {
      margin-top: var(--spacing)
    }
  `,
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

.a { font-weight: bold; font-style: italic; }
.b {
  background: #ff8000;
  color: #111;
}
.c::after {
  content: '!';
}
@media (min-width: 100px) {
  .c {
    font-size: 5em;
  }
  .c::after {
    content: '!!';
  }
}
```

``` mjs
// output.mjs
export const classes = {
  "loud": "a c",
  "button": "a b"
}
```

``` mjs
// app.mjs

import {classes} from './output.mjs'

classes.loud // 'a c'

classes.button // 'a b'
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
