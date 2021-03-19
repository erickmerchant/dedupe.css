# @erickmerchant/css

When I write CSS I like to write it as if each element will have just one class and no other styles will apply except inherited styles. It is nice to look at a rule and see all the declarations that will be applied. This makes authoring easier.

In contrast to authoring, the most ideal way to ship CSS to browsers is with little to no duplication. Something as close to atomic or functional as possible. Without this optimization, compression will help but my CSS is still more verbose than it needs to be. Also sure browsers are very fast at processing CSS — they have to be — but it seems like they would certainly be faster with less CSS.

This project's goal is to allow a good authoring experience while shipping highly optimized atomic css. The CLI takes a single JS module entry point, and then outputs a single CSS file and a generated JS module file that has a map of keys to the generated class names in the CSS file.

```
npx @erickmerchant/css --help
```
