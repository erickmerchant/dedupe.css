# dedupe.css

Combines the benefits of a good naming strategy with the benefits of utility classes.

This project's goal is to allow a good authoring experience while shipping highly optimized css. The CLI takes a single JS module entry point, and then outputs a single CSS file, plus a generated JS module and JSON file that both have a map of keys to the generated class names in the CSS file.

```
npx dedupe.css --help
```
