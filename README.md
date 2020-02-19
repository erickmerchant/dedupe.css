# @erickmerchant/css

_CSS from JS_

When I write CSS, I like to write it as if each element will have just one class, and no other styles will apply to that element, except via inheritance. It's nice to look at a rule and see all the declarations that will be applied. I feel like this makes authoring easier, at least for me. To avoid copy-pasting, composition can be used.

But the most ideal way to ship CSS to the browsers is with little to no duplication. Something as close to atomic or functional as possible. Without this optimization, compression will help, but my CSS is still bigger than it needs to be.

This module takes a single ES module entry point, and outputs a single CSS file and a generated ES module that has a map of keys to the generated class names in the css file.

# Example

``` javascript
// input.js
const desktop = '@media (min-width: 100px)'

// some styles for reuse. font-weight normal is removed because it's overridden
const emphasis = `
  font-weight: normal;
  font-weight: bold;
`

// these styles are tacked onto the beginning of output.css unmodified
export const _start = `
  p {
    margin-top: var(--spacing)
  }
`

// these are the identifiers (class like) that we'll use later in app.mjs
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

.a { font-weight: bold; }
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

``` javascript
// output.mjs
export const classes = {
  "loud": "a c",
  "button": "a b"
}
```

``` javascript
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
