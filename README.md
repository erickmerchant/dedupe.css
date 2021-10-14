# dedupe.css

Simply put this project's purpose is to allow you to author CSS with repeating declarations, and transform that to CSS where as much as possible declarations are not repeated, à la atomic CSS. For now it is entirely a JS to CSS solution, meaning you author your CSS in JS.

## the cli

The CLI takes a single JS module input file, and then outputs a single CSS file, plus a generated JS module and JSON file that both have a map of keys to the generated class names in the CSS file.

## an example

### the entry file

In this contrived example we have four classes: `.box-1`, `.box-2`, `.box-3`, and `.box-4`. [postcss-nesting] is used to allow nesting.

```javascript
// Please note that "css" only outputs a string. It is used to gain syntax highlighting, and is not strictly necessary.
import {css} from 'dedupe.css';

//  the export doesn't have to be "classes"
export const classes = css`
  .box-1 {
    margin-right: 1em;
    color: white;
    background-color: gray;

    @media (min-width: 700px) {
      margin-right: 2em;
    }
  }

  .box-2 {
    margin: 2em;
    margin-right: 1em;
    color: black;
    background-color: white;

    @media (min-width: 700px) {
      margin: 3em;
      margin-right: 2em;
    }
  }

  .box-3 {
    margin-top: 1em;
    margin-bottom: 1em;
    color: white;
    background-color: gray;

    @media (min-width: 700px) {
      margin-top: 2em;
      margin-bottom: 2em;
    }
  }

  .box-4 {
    margin-left: 1em;
    margin: 2em;
    margin-right: 1em;
    color: black;
    background-color: white;

    @media (min-width: 700px) {
      margin-left: 2em;
      margin: 3em;
      margin-right: 2em;
    }
  }
`;

// _start gets prepended to the output css. There is also _end which would get appended.
export const _start = css`
  * {
    margin: 0;
    font: inherit;
  }
`;
```

### the structure of the output

This is the output from running dedup.css against the input above.

#### css

First any CSS outside an at-rule is output, then at-rules are output, sorted with postcss-sort-media-queries. Outside of any at-rule, and within each, the CSS that's generated is output in three parts. First any shorthand properties are output. Then any properties that are not shared by two or more classes are output, like `margin-top: 1em` and `margin-bottom: 1em` in the example. Last are all the properties that are not shorthands that are shared. Dedupe.css does this by putting everything into a sqlite database and then querying it to find which properties are shared and not.

```css
* {
  margin: 0;
  font: inherit;
}
.a {
  margin: 2em;
}
.b {
  margin-top: 1em;
  margin-bottom: 1em;
}
.c {
  margin-right: 1em;
}
.d {
  background-color: gray;
  color: white;
}
.a {
  background-color: white;
  color: black;
}
@media (min-width: 700px) {
  .a {
    margin: 3em;
  }
  .b {
    margin-top: 2em;
    margin-bottom: 2em;
  }
  .c {
    margin-right: 2em;
  }
}
```

This also demonstrates that shorthands negate any constituent properties that they succeed, but not ones they precede. For instance `margin-left` is gone from the output, when it occurs in the input.

#### js

The output JS has the same exports as the input, but instead of CSS tagged template literals it has objects with keys corresponding to the original classes and values corresponding to the generated ones.

```javascript
export const classes = {
  'box-2': 'a c',
  'box-4': 'a c',
  'box-3': 'b d',
  'box-1': 'c d',
};
```

#### json

The JSON is just like the JS. It's provided for situations where you aren't using JS. For instance it could be used with a templating language.

```json
{
  "classes": {
    "box-2": "a c",
    "box-4": "a c",
    "box-3": "b d",
    "box-1": "c d"
  }
}
```

## --dev

When you use --dev the JS output is different. Instead of a plain object it outputs a proxy that wraps an object with a bunch of getters. This is done so that you can see which keys are not used in dev tools using the coverage tool. Also the proxy has a get trap that will throw an error when accessing missing keys.

```js
export const classes = new Proxy(
  {
    get ['box-2']() {
      return 'a c';
    },
    get ['box-4']() {
      return 'a c';
    },
    get ['box-3']() {
      return 'b d';
    },
    get ['box-1']() {
      return 'c d';
    },
  },
  {
    get(target, prop) {
      if ({}.hasOwnProperty.call(target, prop)) {
        return 'classes:' + prop + ' ' + Reflect.get(target, prop);
      }

      throw Error('classes:' + prop + ' is undefined');
    },
  }
);
```

## additional selectors

You can use pseudo-elements, pseudo-classes, and other modifiers, so long as they target an element with a class, and the selector itself starts with that class. No complex selectors are allowed essentially. This restriction exists because otherwise dedupe.css couldn't guarantee that the styles would actually be applied as intended, since it changes the order of declarations. Please note that pseudo-classes and other modifiers also can't always be optimized like classes alone can, though pseudo-elements always can.

```css
.box-1 {
  /* ✅ allowed */
  &:before {
    content: '';
  }

  /* ✅ allowed */
  &.red {
    color: red;
  }

  /* ✅ allowed */
  &:not(a) {
    color: black;
  }

  /* ✅ allowed */
  &:nth-child(2) {
    font-weight: normal;
  }

  /* ❌ not allowed */
  & + & {
    margin-top: 1em;
  }

  /* ❌ not allowed */
  & span {
    color: gray;
  }

  /* ❌ not allowed */
  & span:nth-child(1) {
    font-weight: bold;
  }
}
```

## mixins

A neat trick is that you can have mixins that are made possible by the input being run through [postcss-nesting].

```javascript
const boldMixin = css`
  & {
    font-weight: bold;
  }
`;

const classes = css`
  .heading {
    ${boldMixin}
  }
`;
```

## to do

- programmatic api
- support CSS input file
- allow stdin

[postcss-nesting]: https://www.npmjs.com/package/postcss-nesting
[postcss-sort-media-queries]: https://www.npmjs.com/package/postcss-sort-media-queries
