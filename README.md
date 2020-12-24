# @erickmerchant/css

When I write CSS, I like to write it as if each element will have just one class, and no other styles will apply to that element, except via inheritance. It's nice to look at a rule and see all the declarations that will be applied. I feel like this makes authoring easier, at least for me. To avoid copy-pasting, concatenation can be used.

In contrast to authoring, the most ideal way to ship CSS to browsers is with little to no duplication. Something as close to atomic or functional as possible. Without this optimization, compression will help, but my CSS is still bigger than it needs to be.

This project aims to combine those two ideals. The CLI takes a single ES module entry point, and outputs a single CSS file and a generated ES module that has a map of keys to the generated class names in the css file.

```
npx @erickmerchant/css --help
```
