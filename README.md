# @erickmerchant/css

_a cli to generate atomic css_

It takes a css file with custom properties and generates a css file full of atomic css classes.

## Usage

```
npx @erickmerchant/css -h
```

## Example

```
npx @erickmerchant/css example/variables.css example/utilities.css
```

``` css
/* example/variables.css */

@custom-media --breakpoint-mobile (width < 40rem);

@custom-media --breakpoint-desktop (width >= 40rem);

:root {
  --padding-1: 0.5rem;
  --padding-2: 1rem;

  --margin-1: 0.5rem;
  --margin-2: 1rem;

  --gap-1: 0.5rem;
  --gap-2: 1rem;

  --width: 50rem;
  --width-double: 100rem;
  --height: 50rem;
  --height-double: 100rem;

  --font-size-xx-large: 5rem;
  --font-size-x-large: 2.5rem;
  --font-size-large: 1.25rem;
  --font-size-medium: 1rem;
  --font-size-small: 0.8rem;

  --border-width: 3px;
  --border-radius: 3px;

  --border-width-double: 6px;
  --border-radius-double: 6px;

  --blue: hsl(200, 100%, 50%);
  --gray: gray(50);
  --orange: rgb(255, 125, 0);
  --pink: #FF0080;
}
```
