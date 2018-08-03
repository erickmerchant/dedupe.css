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

@custom-media --breakpoint-desktop (width >= 40rem);

:root {
  --padding: 0.5rem;
  --padding-more: 1rem;

  --margin: 0.5rem;
  --margin-more: 1rem;

  --gap: 0.5rem;
  --gap-more: 1rem;

  --width: 50rem;
  --width-more: 100rem;
  --height: 50rem;
  --height-more: 100rem;

  --font-size: 16px;
  --font-size-more: 32px;

  --border-width: 3px;
  --border-width-more: 6px;

  --border-radius: 3px;
  --border-radius-more: 6px;

  --blue: hsl(200, 100%, 50%);
  --gray: gray(50);
  --orange: rgb(255, 125, 0);
  --pink: #FF0080;
}
```
