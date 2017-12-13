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
  --box-sizing: false;

  --whitespace-1: 0.5rem;
  --whitespace-2: 1rem;
  --whitespace-3: 2rem;
  --whitespace-4: 4rem;

  --width-1: calc(100% / 3);
  --width-2: calc(100% / 3 * 2);

  --max-width: 40rem;

  --font-size-large: 1.125rem;
  --font-size-medium: 1rem;
  --font-size-small: 0.875rem;

  --border-radius: 0.2em;
  --border-width: 0.05em;

  --black: hsl(0, 0%, 10%);
  --gray: hsl(0, 0%, 50%);
  --white: hsl(0, 0%, 90%);

  --red: hsl(350, 60%, 60%);
  --green: hsl(110, 60%, 60%);
  --blue: hsl(230, 60%, 60%);
}
```
