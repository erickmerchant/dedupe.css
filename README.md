# @erickmerchant/css

_a cli to generate atomic css_

It takes a css file with custom properties and generates a css file full of atomic css classes.

## Install

```
npm install -g @erickmerchant/css
```

## Example

```
css example/variables.css example/utilities.css
```

``` css
/* example/variables.css */

@custom-media --breakpoint-mobile (width < 40rem);

@custom-media --breakpoint-desktop (width >= 40rem);

:root {
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

  --black: hsl(0, 0%, 12.5%);
  --dark-gray: hsl(0, 0%, 45%);
  --gray: hsl(0, 0%, 65%);
  --light-gray: hsl(0, 0%, 97.5%);
  --white: hsl(0, 0%, 100%);
  --red: hsl(350, 60%, 60%);
  --orange: hsl(30, 70%, 60%);
  --green: hsl(140, 50%, 60%);
  --blue: hsl(200, 70%, 60%);
  --purple: hsl(310, 60%, 60%);
}
```

``` css
/* example/utilities.css */

@import "./variables.css";
*, *:before, *:after { box-sizing: inherit; }
.border-box { box-sizing: border-box; }
.content-box { box-sizing: content-box; }
.bold { font-weight: bold; }
.italic { font-style: italic; }
.underline { text-decoration: underline; }
.nowrap { white-space: nowrap; }
.list-style-none { list-style: none; }
.overflow-scroll { overflow: scroll; }
.right { float: right; }
.left { float: left; }
.flex { display: flex;  }
.inline-flex { display: inline-flex;  }
.auto { flex: 1 1 auto;  }
.row { flex-direction: row; }
.row-reverse { flex-direction: row-reverse; }
.column { flex-direction: column; }
.column-reverse { flex-direction: column-reverse; }
.wrap { flex-wrap: wrap; }
.wrap-reverse { flex-wrap: wrap-reverse; }
.justify-around { justify-content: space-around; }
.justify-between { justify-content: space-between; }
.justify-start { justify-content: flex-start; }
.justify-end { justify-content: flex-end; }
.justify-center { justify-content: center; }
.items-stretch { align-items: stretch; }
.items-start { align-items: flex-start; }
.items-end { align-items: flex-end; }
.items-center { align-items: center; }
.items-baseline { align-items: baseline; }
.content-around { align-content: space-around; }
.content-between { align-content: space-between; }
.content-start { align-content: flex-start; }
.content-end { align-content: flex-end; }
.content-center { align-content: center; }
.content-stretch { align-content: stretch; }
.self-stretch { align-self: stretch; }
.self-start { align-self: flex-start; }
.self-end { align-self: flex-end; }
.self-center { align-self: center; }
.self-baseline { align-self: baseline; }
.inline-block { display: inline-block; }
.block { display: block; }
.none { display: none; }
.relative { position: relative; }
.absolute { position: absolute; }
.fixed { position: fixed; }
.top-0 { top: 0; }
.right-0 { right: 0; }
.bottom-0 { bottom: 0; }
.left-0 { left: 0; }
.fit-width { max-width: 100%; }
.full-width { width: 100%; }
.align-center { text-align: center; }
.align-left { text-align: left; }
.align-right { text-align: right; }
.width-1 { width: var(--width-1); }
.width-2 { width: var(--width-2); }
.max-width { max-width: var(--max-width); }
.margin-1 {
  margin-top: var(--whitespace-1);
  margin-right: var(--whitespace-1);
  margin-bottom: var(--whitespace-1);
  margin-left: var(--whitespace-1);
}
.margin-horizontal-1 {
  margin-right: var(--whitespace-1);
  margin-left: var(--whitespace-1);
}
.margin-vertical-1 {
  margin-top: var(--whitespace-1);
  margin-bottom: var(--whitespace-1);
}
.margin-top-1 { margin-top: var(--whitespace-1); }
.margin-right-1 { margin-right: var(--whitespace-1); }
.margin-bottom-1 { margin-bottom: var(--whitespace-1); }
.margin-left-1 { margin-left: var(--whitespace-1); }
.margin-2 {
  margin-top: var(--whitespace-2);
  margin-right: var(--whitespace-2);
  margin-bottom: var(--whitespace-2);
  margin-left: var(--whitespace-2);
}
.margin-horizontal-2 {
  margin-right: var(--whitespace-2);
  margin-left: var(--whitespace-2);
}
.margin-vertical-2 {
  margin-top: var(--whitespace-2);
  margin-bottom: var(--whitespace-2);
}
.margin-top-2 { margin-top: var(--whitespace-2); }
.margin-right-2 { margin-right: var(--whitespace-2); }
.margin-bottom-2 { margin-bottom: var(--whitespace-2); }
.margin-left-2 { margin-left: var(--whitespace-2); }
.margin-3 {
  margin-top: var(--whitespace-3);
  margin-right: var(--whitespace-3);
  margin-bottom: var(--whitespace-3);
  margin-left: var(--whitespace-3);
}
.margin-horizontal-3 {
  margin-right: var(--whitespace-3);
  margin-left: var(--whitespace-3);
}
.margin-vertical-3 {
  margin-top: var(--whitespace-3);
  margin-bottom: var(--whitespace-3);
}
.margin-top-3 { margin-top: var(--whitespace-3); }
.margin-right-3 { margin-right: var(--whitespace-3); }
.margin-bottom-3 { margin-bottom: var(--whitespace-3); }
.margin-left-3 { margin-left: var(--whitespace-3); }
.margin-4 {
  margin-top: var(--whitespace-4);
  margin-right: var(--whitespace-4);
  margin-bottom: var(--whitespace-4);
  margin-left: var(--whitespace-4);
}
.margin-horizontal-4 {
  margin-right: var(--whitespace-4);
  margin-left: var(--whitespace-4);
}
.margin-vertical-4 {
  margin-top: var(--whitespace-4);
  margin-bottom: var(--whitespace-4);
}
.margin-top-4 { margin-top: var(--whitespace-4); }
.margin-right-4 { margin-right: var(--whitespace-4); }
.margin-bottom-4 { margin-bottom: var(--whitespace-4); }
.margin-left-4 { margin-left: var(--whitespace-4); }
.margin-0 {
  margin-top: 0;
  margin-right: 0;
  margin-bottom: 0;
  margin-left: 0;
}
.margin-horizontal-0 {
  margin-right: 0;
  margin-left: 0;
}
.margin-vertical-0 {
  margin-top: 0;
  margin-bottom: 0;
}
.margin-top-0 { margin-top: 0; }
.margin-right-0 { margin-right: 0; }
.margin-bottom-0 { margin-bottom: 0; }
.margin-left-0 { margin-left: 0; }
.margin-auto {
  margin-top: auto;
  margin-right: auto;
  margin-bottom: auto;
  margin-left: auto;
}
.margin-horizontal-auto {
  margin-right: auto;
  margin-left: auto;
}
.margin-vertical-auto {
  margin-top: auto;
  margin-bottom: auto;
}
.margin-top-auto { margin-top: auto; }
.margin-right-auto { margin-right: auto; }
.margin-bottom-auto { margin-bottom: auto; }
.margin-left-auto { margin-left: auto; }
.padding-1 {
  padding-top: var(--whitespace-1);
  padding-right: var(--whitespace-1);
  padding-bottom: var(--whitespace-1);
  padding-left: var(--whitespace-1);
}
.padding-horizontal-1 {
  padding-right: var(--whitespace-1);
  padding-left: var(--whitespace-1);
}
.padding-vertical-1 {
  padding-top: var(--whitespace-1);
  padding-bottom: var(--whitespace-1);
}
.padding-top-1 { padding-top: var(--whitespace-1); }
.padding-right-1 { padding-right: var(--whitespace-1); }
.padding-bottom-1 { padding-bottom: var(--whitespace-1); }
.padding-left-1 { padding-left: var(--whitespace-1); }
.padding-2 {
  padding-top: var(--whitespace-2);
  padding-right: var(--whitespace-2);
  padding-bottom: var(--whitespace-2);
  padding-left: var(--whitespace-2);
}
.padding-horizontal-2 {
  padding-right: var(--whitespace-2);
  padding-left: var(--whitespace-2);
}
.padding-vertical-2 {
  padding-top: var(--whitespace-2);
  padding-bottom: var(--whitespace-2);
}
.padding-top-2 { padding-top: var(--whitespace-2); }
.padding-right-2 { padding-right: var(--whitespace-2); }
.padding-bottom-2 { padding-bottom: var(--whitespace-2); }
.padding-left-2 { padding-left: var(--whitespace-2); }
.padding-3 {
  padding-top: var(--whitespace-3);
  padding-right: var(--whitespace-3);
  padding-bottom: var(--whitespace-3);
  padding-left: var(--whitespace-3);
}
.padding-horizontal-3 {
  padding-right: var(--whitespace-3);
  padding-left: var(--whitespace-3);
}
.padding-vertical-3 {
  padding-top: var(--whitespace-3);
  padding-bottom: var(--whitespace-3);
}
.padding-top-3 { padding-top: var(--whitespace-3); }
.padding-right-3 { padding-right: var(--whitespace-3); }
.padding-bottom-3 { padding-bottom: var(--whitespace-3); }
.padding-left-3 { padding-left: var(--whitespace-3); }
.padding-4 {
  padding-top: var(--whitespace-4);
  padding-right: var(--whitespace-4);
  padding-bottom: var(--whitespace-4);
  padding-left: var(--whitespace-4);
}
.padding-horizontal-4 {
  padding-right: var(--whitespace-4);
  padding-left: var(--whitespace-4);
}
.padding-vertical-4 {
  padding-top: var(--whitespace-4);
  padding-bottom: var(--whitespace-4);
}
.padding-top-4 { padding-top: var(--whitespace-4); }
.padding-right-4 { padding-right: var(--whitespace-4); }
.padding-bottom-4 { padding-bottom: var(--whitespace-4); }
.padding-left-4 { padding-left: var(--whitespace-4); }
.padding-0 {
  padding-top: 0;
  padding-right: 0;
  padding-bottom: 0;
  padding-left: 0;
}
.padding-horizontal-0 {
  padding-right: 0;
  padding-left: 0;
}
.padding-vertical-0 {
  padding-top: 0;
  padding-bottom: 0;
}
.padding-top-0 { padding-top: 0; }
.padding-right-0 { padding-right: 0; }
.padding-bottom-0 { padding-bottom: 0; }
.padding-left-0 { padding-left: 0; }
.font-size-large { font-size: var(--font-size-large); }
.font-size-medium { font-size: var(--font-size-medium); }
.font-size-small { font-size: var(--font-size-small); }
@media (--breakpoint-mobile) {
.mobile-flex { display: flex;  }
.mobile-inline-flex { display: inline-flex;  }
.mobile-auto { flex: 1 1 auto;  }
.mobile-row { flex-direction: row; }
.mobile-row-reverse { flex-direction: row-reverse; }
.mobile-column { flex-direction: column; }
.mobile-column-reverse { flex-direction: column-reverse; }
.mobile-wrap { flex-wrap: wrap; }
.mobile-wrap-reverse { flex-wrap: wrap-reverse; }
.mobile-justify-around { justify-content: space-around; }
.mobile-justify-between { justify-content: space-between; }
.mobile-justify-start { justify-content: flex-start; }
.mobile-justify-end { justify-content: flex-end; }
.mobile-justify-center { justify-content: center; }
.mobile-items-stretch { align-items: stretch; }
.mobile-items-start { align-items: flex-start; }
.mobile-items-end { align-items: flex-end; }
.mobile-items-center { align-items: center; }
.mobile-items-baseline { align-items: baseline; }
.mobile-content-around { align-content: space-around; }
.mobile-content-between { align-content: space-between; }
.mobile-content-start { align-content: flex-start; }
.mobile-content-end { align-content: flex-end; }
.mobile-content-center { align-content: center; }
.mobile-content-stretch { align-content: stretch; }
.mobile-self-stretch { align-self: stretch; }
.mobile-self-start { align-self: flex-start; }
.mobile-self-end { align-self: flex-end; }
.mobile-self-center { align-self: center; }
.mobile-self-baseline { align-self: baseline; }
.mobile-inline-block { display: inline-block; }
.mobile-block { display: block; }
.mobile-none { display: none; }
.mobile-relative { position: relative; }
.mobile-absolute { position: absolute; }
.mobile-fixed { position: fixed; }
.mobile-top-0 { top: 0; }
.mobile-right-0 { right: 0; }
.mobile-bottom-0 { bottom: 0; }
.mobile-left-0 { left: 0; }
.mobile-fit-width { max-width: 100%; }
.mobile-full-width { width: 100%; }
.mobile-align-center { text-align: center; }
.mobile-align-left { text-align: left; }
.mobile-align-right { text-align: right; }
.mobile-width-1 { width: var(--width-1); }
.mobile-width-2 { width: var(--width-2); }
.mobile-max-width { max-width: var(--max-width); }
.mobile-margin-1 {
  margin-top: var(--whitespace-1);
  margin-right: var(--whitespace-1);
  margin-bottom: var(--whitespace-1);
  margin-left: var(--whitespace-1);
}
.mobile-margin-horizontal-1 {
  margin-right: var(--whitespace-1);
  margin-left: var(--whitespace-1);
}
.mobile-margin-vertical-1 {
  margin-top: var(--whitespace-1);
  margin-bottom: var(--whitespace-1);
}
.mobile-margin-top-1 { margin-top: var(--whitespace-1); }
.mobile-margin-right-1 { margin-right: var(--whitespace-1); }
.mobile-margin-bottom-1 { margin-bottom: var(--whitespace-1); }
.mobile-margin-left-1 { margin-left: var(--whitespace-1); }
.mobile-margin-2 {
  margin-top: var(--whitespace-2);
  margin-right: var(--whitespace-2);
  margin-bottom: var(--whitespace-2);
  margin-left: var(--whitespace-2);
}
.mobile-margin-horizontal-2 {
  margin-right: var(--whitespace-2);
  margin-left: var(--whitespace-2);
}
.mobile-margin-vertical-2 {
  margin-top: var(--whitespace-2);
  margin-bottom: var(--whitespace-2);
}
.mobile-margin-top-2 { margin-top: var(--whitespace-2); }
.mobile-margin-right-2 { margin-right: var(--whitespace-2); }
.mobile-margin-bottom-2 { margin-bottom: var(--whitespace-2); }
.mobile-margin-left-2 { margin-left: var(--whitespace-2); }
.mobile-margin-3 {
  margin-top: var(--whitespace-3);
  margin-right: var(--whitespace-3);
  margin-bottom: var(--whitespace-3);
  margin-left: var(--whitespace-3);
}
.mobile-margin-horizontal-3 {
  margin-right: var(--whitespace-3);
  margin-left: var(--whitespace-3);
}
.mobile-margin-vertical-3 {
  margin-top: var(--whitespace-3);
  margin-bottom: var(--whitespace-3);
}
.mobile-margin-top-3 { margin-top: var(--whitespace-3); }
.mobile-margin-right-3 { margin-right: var(--whitespace-3); }
.mobile-margin-bottom-3 { margin-bottom: var(--whitespace-3); }
.mobile-margin-left-3 { margin-left: var(--whitespace-3); }
.mobile-margin-4 {
  margin-top: var(--whitespace-4);
  margin-right: var(--whitespace-4);
  margin-bottom: var(--whitespace-4);
  margin-left: var(--whitespace-4);
}
.mobile-margin-horizontal-4 {
  margin-right: var(--whitespace-4);
  margin-left: var(--whitespace-4);
}
.mobile-margin-vertical-4 {
  margin-top: var(--whitespace-4);
  margin-bottom: var(--whitespace-4);
}
.mobile-margin-top-4 { margin-top: var(--whitespace-4); }
.mobile-margin-right-4 { margin-right: var(--whitespace-4); }
.mobile-margin-bottom-4 { margin-bottom: var(--whitespace-4); }
.mobile-margin-left-4 { margin-left: var(--whitespace-4); }
.mobile-margin-0 {
  margin-top: 0;
  margin-right: 0;
  margin-bottom: 0;
  margin-left: 0;
}
.mobile-margin-horizontal-0 {
  margin-right: 0;
  margin-left: 0;
}
.mobile-margin-vertical-0 {
  margin-top: 0;
  margin-bottom: 0;
}
.mobile-margin-top-0 { margin-top: 0; }
.mobile-margin-right-0 { margin-right: 0; }
.mobile-margin-bottom-0 { margin-bottom: 0; }
.mobile-margin-left-0 { margin-left: 0; }
.mobile-margin-auto {
  margin-top: auto;
  margin-right: auto;
  margin-bottom: auto;
  margin-left: auto;
}
.mobile-margin-horizontal-auto {
  margin-right: auto;
  margin-left: auto;
}
.mobile-margin-vertical-auto {
  margin-top: auto;
  margin-bottom: auto;
}
.mobile-margin-top-auto { margin-top: auto; }
.mobile-margin-right-auto { margin-right: auto; }
.mobile-margin-bottom-auto { margin-bottom: auto; }
.mobile-margin-left-auto { margin-left: auto; }
.mobile-padding-1 {
  padding-top: var(--whitespace-1);
  padding-right: var(--whitespace-1);
  padding-bottom: var(--whitespace-1);
  padding-left: var(--whitespace-1);
}
.mobile-padding-horizontal-1 {
  padding-right: var(--whitespace-1);
  padding-left: var(--whitespace-1);
}
.mobile-padding-vertical-1 {
  padding-top: var(--whitespace-1);
  padding-bottom: var(--whitespace-1);
}
.mobile-padding-top-1 { padding-top: var(--whitespace-1); }
.mobile-padding-right-1 { padding-right: var(--whitespace-1); }
.mobile-padding-bottom-1 { padding-bottom: var(--whitespace-1); }
.mobile-padding-left-1 { padding-left: var(--whitespace-1); }
.mobile-padding-2 {
  padding-top: var(--whitespace-2);
  padding-right: var(--whitespace-2);
  padding-bottom: var(--whitespace-2);
  padding-left: var(--whitespace-2);
}
.mobile-padding-horizontal-2 {
  padding-right: var(--whitespace-2);
  padding-left: var(--whitespace-2);
}
.mobile-padding-vertical-2 {
  padding-top: var(--whitespace-2);
  padding-bottom: var(--whitespace-2);
}
.mobile-padding-top-2 { padding-top: var(--whitespace-2); }
.mobile-padding-right-2 { padding-right: var(--whitespace-2); }
.mobile-padding-bottom-2 { padding-bottom: var(--whitespace-2); }
.mobile-padding-left-2 { padding-left: var(--whitespace-2); }
.mobile-padding-3 {
  padding-top: var(--whitespace-3);
  padding-right: var(--whitespace-3);
  padding-bottom: var(--whitespace-3);
  padding-left: var(--whitespace-3);
}
.mobile-padding-horizontal-3 {
  padding-right: var(--whitespace-3);
  padding-left: var(--whitespace-3);
}
.mobile-padding-vertical-3 {
  padding-top: var(--whitespace-3);
  padding-bottom: var(--whitespace-3);
}
.mobile-padding-top-3 { padding-top: var(--whitespace-3); }
.mobile-padding-right-3 { padding-right: var(--whitespace-3); }
.mobile-padding-bottom-3 { padding-bottom: var(--whitespace-3); }
.mobile-padding-left-3 { padding-left: var(--whitespace-3); }
.mobile-padding-4 {
  padding-top: var(--whitespace-4);
  padding-right: var(--whitespace-4);
  padding-bottom: var(--whitespace-4);
  padding-left: var(--whitespace-4);
}
.mobile-padding-horizontal-4 {
  padding-right: var(--whitespace-4);
  padding-left: var(--whitespace-4);
}
.mobile-padding-vertical-4 {
  padding-top: var(--whitespace-4);
  padding-bottom: var(--whitespace-4);
}
.mobile-padding-top-4 { padding-top: var(--whitespace-4); }
.mobile-padding-right-4 { padding-right: var(--whitespace-4); }
.mobile-padding-bottom-4 { padding-bottom: var(--whitespace-4); }
.mobile-padding-left-4 { padding-left: var(--whitespace-4); }
.mobile-padding-0 {
  padding-top: 0;
  padding-right: 0;
  padding-bottom: 0;
  padding-left: 0;
}
.mobile-padding-horizontal-0 {
  padding-right: 0;
  padding-left: 0;
}
.mobile-padding-vertical-0 {
  padding-top: 0;
  padding-bottom: 0;
}
.mobile-padding-top-0 { padding-top: 0; }
.mobile-padding-right-0 { padding-right: 0; }
.mobile-padding-bottom-0 { padding-bottom: 0; }
.mobile-padding-left-0 { padding-left: 0; }
.mobile-font-size-large { font-size: var(--font-size-large); }
.mobile-font-size-medium { font-size: var(--font-size-medium); }
.mobile-font-size-small { font-size: var(--font-size-small); }
}
@media (--breakpoint-desktop) {
.desktop-flex { display: flex;  }
.desktop-inline-flex { display: inline-flex;  }
.desktop-auto { flex: 1 1 auto;  }
.desktop-row { flex-direction: row; }
.desktop-row-reverse { flex-direction: row-reverse; }
.desktop-column { flex-direction: column; }
.desktop-column-reverse { flex-direction: column-reverse; }
.desktop-wrap { flex-wrap: wrap; }
.desktop-wrap-reverse { flex-wrap: wrap-reverse; }
.desktop-justify-around { justify-content: space-around; }
.desktop-justify-between { justify-content: space-between; }
.desktop-justify-start { justify-content: flex-start; }
.desktop-justify-end { justify-content: flex-end; }
.desktop-justify-center { justify-content: center; }
.desktop-items-stretch { align-items: stretch; }
.desktop-items-start { align-items: flex-start; }
.desktop-items-end { align-items: flex-end; }
.desktop-items-center { align-items: center; }
.desktop-items-baseline { align-items: baseline; }
.desktop-content-around { align-content: space-around; }
.desktop-content-between { align-content: space-between; }
.desktop-content-start { align-content: flex-start; }
.desktop-content-end { align-content: flex-end; }
.desktop-content-center { align-content: center; }
.desktop-content-stretch { align-content: stretch; }
.desktop-self-stretch { align-self: stretch; }
.desktop-self-start { align-self: flex-start; }
.desktop-self-end { align-self: flex-end; }
.desktop-self-center { align-self: center; }
.desktop-self-baseline { align-self: baseline; }
.desktop-inline-block { display: inline-block; }
.desktop-block { display: block; }
.desktop-none { display: none; }
.desktop-relative { position: relative; }
.desktop-absolute { position: absolute; }
.desktop-fixed { position: fixed; }
.desktop-top-0 { top: 0; }
.desktop-right-0 { right: 0; }
.desktop-bottom-0 { bottom: 0; }
.desktop-left-0 { left: 0; }
.desktop-fit-width { max-width: 100%; }
.desktop-full-width { width: 100%; }
.desktop-align-center { text-align: center; }
.desktop-align-left { text-align: left; }
.desktop-align-right { text-align: right; }
.desktop-width-1 { width: var(--width-1); }
.desktop-width-2 { width: var(--width-2); }
.desktop-max-width { max-width: var(--max-width); }
.desktop-margin-1 {
  margin-top: var(--whitespace-1);
  margin-right: var(--whitespace-1);
  margin-bottom: var(--whitespace-1);
  margin-left: var(--whitespace-1);
}
.desktop-margin-horizontal-1 {
  margin-right: var(--whitespace-1);
  margin-left: var(--whitespace-1);
}
.desktop-margin-vertical-1 {
  margin-top: var(--whitespace-1);
  margin-bottom: var(--whitespace-1);
}
.desktop-margin-top-1 { margin-top: var(--whitespace-1); }
.desktop-margin-right-1 { margin-right: var(--whitespace-1); }
.desktop-margin-bottom-1 { margin-bottom: var(--whitespace-1); }
.desktop-margin-left-1 { margin-left: var(--whitespace-1); }
.desktop-margin-2 {
  margin-top: var(--whitespace-2);
  margin-right: var(--whitespace-2);
  margin-bottom: var(--whitespace-2);
  margin-left: var(--whitespace-2);
}
.desktop-margin-horizontal-2 {
  margin-right: var(--whitespace-2);
  margin-left: var(--whitespace-2);
}
.desktop-margin-vertical-2 {
  margin-top: var(--whitespace-2);
  margin-bottom: var(--whitespace-2);
}
.desktop-margin-top-2 { margin-top: var(--whitespace-2); }
.desktop-margin-right-2 { margin-right: var(--whitespace-2); }
.desktop-margin-bottom-2 { margin-bottom: var(--whitespace-2); }
.desktop-margin-left-2 { margin-left: var(--whitespace-2); }
.desktop-margin-3 {
  margin-top: var(--whitespace-3);
  margin-right: var(--whitespace-3);
  margin-bottom: var(--whitespace-3);
  margin-left: var(--whitespace-3);
}
.desktop-margin-horizontal-3 {
  margin-right: var(--whitespace-3);
  margin-left: var(--whitespace-3);
}
.desktop-margin-vertical-3 {
  margin-top: var(--whitespace-3);
  margin-bottom: var(--whitespace-3);
}
.desktop-margin-top-3 { margin-top: var(--whitespace-3); }
.desktop-margin-right-3 { margin-right: var(--whitespace-3); }
.desktop-margin-bottom-3 { margin-bottom: var(--whitespace-3); }
.desktop-margin-left-3 { margin-left: var(--whitespace-3); }
.desktop-margin-4 {
  margin-top: var(--whitespace-4);
  margin-right: var(--whitespace-4);
  margin-bottom: var(--whitespace-4);
  margin-left: var(--whitespace-4);
}
.desktop-margin-horizontal-4 {
  margin-right: var(--whitespace-4);
  margin-left: var(--whitespace-4);
}
.desktop-margin-vertical-4 {
  margin-top: var(--whitespace-4);
  margin-bottom: var(--whitespace-4);
}
.desktop-margin-top-4 { margin-top: var(--whitespace-4); }
.desktop-margin-right-4 { margin-right: var(--whitespace-4); }
.desktop-margin-bottom-4 { margin-bottom: var(--whitespace-4); }
.desktop-margin-left-4 { margin-left: var(--whitespace-4); }
.desktop-margin-0 {
  margin-top: 0;
  margin-right: 0;
  margin-bottom: 0;
  margin-left: 0;
}
.desktop-margin-horizontal-0 {
  margin-right: 0;
  margin-left: 0;
}
.desktop-margin-vertical-0 {
  margin-top: 0;
  margin-bottom: 0;
}
.desktop-margin-top-0 { margin-top: 0; }
.desktop-margin-right-0 { margin-right: 0; }
.desktop-margin-bottom-0 { margin-bottom: 0; }
.desktop-margin-left-0 { margin-left: 0; }
.desktop-margin-auto {
  margin-top: auto;
  margin-right: auto;
  margin-bottom: auto;
  margin-left: auto;
}
.desktop-margin-horizontal-auto {
  margin-right: auto;
  margin-left: auto;
}
.desktop-margin-vertical-auto {
  margin-top: auto;
  margin-bottom: auto;
}
.desktop-margin-top-auto { margin-top: auto; }
.desktop-margin-right-auto { margin-right: auto; }
.desktop-margin-bottom-auto { margin-bottom: auto; }
.desktop-margin-left-auto { margin-left: auto; }
.desktop-padding-1 {
  padding-top: var(--whitespace-1);
  padding-right: var(--whitespace-1);
  padding-bottom: var(--whitespace-1);
  padding-left: var(--whitespace-1);
}
.desktop-padding-horizontal-1 {
  padding-right: var(--whitespace-1);
  padding-left: var(--whitespace-1);
}
.desktop-padding-vertical-1 {
  padding-top: var(--whitespace-1);
  padding-bottom: var(--whitespace-1);
}
.desktop-padding-top-1 { padding-top: var(--whitespace-1); }
.desktop-padding-right-1 { padding-right: var(--whitespace-1); }
.desktop-padding-bottom-1 { padding-bottom: var(--whitespace-1); }
.desktop-padding-left-1 { padding-left: var(--whitespace-1); }
.desktop-padding-2 {
  padding-top: var(--whitespace-2);
  padding-right: var(--whitespace-2);
  padding-bottom: var(--whitespace-2);
  padding-left: var(--whitespace-2);
}
.desktop-padding-horizontal-2 {
  padding-right: var(--whitespace-2);
  padding-left: var(--whitespace-2);
}
.desktop-padding-vertical-2 {
  padding-top: var(--whitespace-2);
  padding-bottom: var(--whitespace-2);
}
.desktop-padding-top-2 { padding-top: var(--whitespace-2); }
.desktop-padding-right-2 { padding-right: var(--whitespace-2); }
.desktop-padding-bottom-2 { padding-bottom: var(--whitespace-2); }
.desktop-padding-left-2 { padding-left: var(--whitespace-2); }
.desktop-padding-3 {
  padding-top: var(--whitespace-3);
  padding-right: var(--whitespace-3);
  padding-bottom: var(--whitespace-3);
  padding-left: var(--whitespace-3);
}
.desktop-padding-horizontal-3 {
  padding-right: var(--whitespace-3);
  padding-left: var(--whitespace-3);
}
.desktop-padding-vertical-3 {
  padding-top: var(--whitespace-3);
  padding-bottom: var(--whitespace-3);
}
.desktop-padding-top-3 { padding-top: var(--whitespace-3); }
.desktop-padding-right-3 { padding-right: var(--whitespace-3); }
.desktop-padding-bottom-3 { padding-bottom: var(--whitespace-3); }
.desktop-padding-left-3 { padding-left: var(--whitespace-3); }
.desktop-padding-4 {
  padding-top: var(--whitespace-4);
  padding-right: var(--whitespace-4);
  padding-bottom: var(--whitespace-4);
  padding-left: var(--whitespace-4);
}
.desktop-padding-horizontal-4 {
  padding-right: var(--whitespace-4);
  padding-left: var(--whitespace-4);
}
.desktop-padding-vertical-4 {
  padding-top: var(--whitespace-4);
  padding-bottom: var(--whitespace-4);
}
.desktop-padding-top-4 { padding-top: var(--whitespace-4); }
.desktop-padding-right-4 { padding-right: var(--whitespace-4); }
.desktop-padding-bottom-4 { padding-bottom: var(--whitespace-4); }
.desktop-padding-left-4 { padding-left: var(--whitespace-4); }
.desktop-padding-0 {
  padding-top: 0;
  padding-right: 0;
  padding-bottom: 0;
  padding-left: 0;
}
.desktop-padding-horizontal-0 {
  padding-right: 0;
  padding-left: 0;
}
.desktop-padding-vertical-0 {
  padding-top: 0;
  padding-bottom: 0;
}
.desktop-padding-top-0 { padding-top: 0; }
.desktop-padding-right-0 { padding-right: 0; }
.desktop-padding-bottom-0 { padding-bottom: 0; }
.desktop-padding-left-0 { padding-left: 0; }
.desktop-font-size-large { font-size: var(--font-size-large); }
.desktop-font-size-medium { font-size: var(--font-size-medium); }
.desktop-font-size-small { font-size: var(--font-size-small); }
}
.black { color: var(--black); }
.background-black { background-color: var(--black); }
.placeholder-black::placeholder { color: var(--black); }
.border-black {
  border-top: var(--border-width) solid var(--black);
  border-right: var(--border-width) solid var(--black);
  border-bottom: var(--border-width) solid var(--black);
  border-left: var(--border-width) solid var(--black);
}
.border-top-black { border-top: var(--border-width) solid var(--black); }
.border-right-black { border-right: var(--border-width) solid var(--black); }
.border-bottom-black { border-bottom: var(--border-width) solid var(--black); }
.border-left-black { border-left: var(--border-width) solid var(--black); }
.dark-gray { color: var(--dark-gray); }
.background-dark-gray { background-color: var(--dark-gray); }
.placeholder-dark-gray::placeholder { color: var(--dark-gray); }
.border-dark-gray {
  border-top: var(--border-width) solid var(--dark-gray);
  border-right: var(--border-width) solid var(--dark-gray);
  border-bottom: var(--border-width) solid var(--dark-gray);
  border-left: var(--border-width) solid var(--dark-gray);
}
.border-top-dark-gray { border-top: var(--border-width) solid var(--dark-gray); }
.border-right-dark-gray { border-right: var(--border-width) solid var(--dark-gray); }
.border-bottom-dark-gray { border-bottom: var(--border-width) solid var(--dark-gray); }
.border-left-dark-gray { border-left: var(--border-width) solid var(--dark-gray); }
.gray { color: var(--gray); }
.background-gray { background-color: var(--gray); }
.placeholder-gray::placeholder { color: var(--gray); }
.border-gray {
  border-top: var(--border-width) solid var(--gray);
  border-right: var(--border-width) solid var(--gray);
  border-bottom: var(--border-width) solid var(--gray);
  border-left: var(--border-width) solid var(--gray);
}
.border-top-gray { border-top: var(--border-width) solid var(--gray); }
.border-right-gray { border-right: var(--border-width) solid var(--gray); }
.border-bottom-gray { border-bottom: var(--border-width) solid var(--gray); }
.border-left-gray { border-left: var(--border-width) solid var(--gray); }
.light-gray { color: var(--light-gray); }
.background-light-gray { background-color: var(--light-gray); }
.placeholder-light-gray::placeholder { color: var(--light-gray); }
.border-light-gray {
  border-top: var(--border-width) solid var(--light-gray);
  border-right: var(--border-width) solid var(--light-gray);
  border-bottom: var(--border-width) solid var(--light-gray);
  border-left: var(--border-width) solid var(--light-gray);
}
.border-top-light-gray { border-top: var(--border-width) solid var(--light-gray); }
.border-right-light-gray { border-right: var(--border-width) solid var(--light-gray); }
.border-bottom-light-gray { border-bottom: var(--border-width) solid var(--light-gray); }
.border-left-light-gray { border-left: var(--border-width) solid var(--light-gray); }
.white { color: var(--white); }
.background-white { background-color: var(--white); }
.placeholder-white::placeholder { color: var(--white); }
.border-white {
  border-top: var(--border-width) solid var(--white);
  border-right: var(--border-width) solid var(--white);
  border-bottom: var(--border-width) solid var(--white);
  border-left: var(--border-width) solid var(--white);
}
.border-top-white { border-top: var(--border-width) solid var(--white); }
.border-right-white { border-right: var(--border-width) solid var(--white); }
.border-bottom-white { border-bottom: var(--border-width) solid var(--white); }
.border-left-white { border-left: var(--border-width) solid var(--white); }
.red { color: var(--red); }
.background-red { background-color: var(--red); }
.placeholder-red::placeholder { color: var(--red); }
.border-red {
  border-top: var(--border-width) solid var(--red);
  border-right: var(--border-width) solid var(--red);
  border-bottom: var(--border-width) solid var(--red);
  border-left: var(--border-width) solid var(--red);
}
.border-top-red { border-top: var(--border-width) solid var(--red); }
.border-right-red { border-right: var(--border-width) solid var(--red); }
.border-bottom-red { border-bottom: var(--border-width) solid var(--red); }
.border-left-red { border-left: var(--border-width) solid var(--red); }
.orange { color: var(--orange); }
.background-orange { background-color: var(--orange); }
.placeholder-orange::placeholder { color: var(--orange); }
.border-orange {
  border-top: var(--border-width) solid var(--orange);
  border-right: var(--border-width) solid var(--orange);
  border-bottom: var(--border-width) solid var(--orange);
  border-left: var(--border-width) solid var(--orange);
}
.border-top-orange { border-top: var(--border-width) solid var(--orange); }
.border-right-orange { border-right: var(--border-width) solid var(--orange); }
.border-bottom-orange { border-bottom: var(--border-width) solid var(--orange); }
.border-left-orange { border-left: var(--border-width) solid var(--orange); }
.green { color: var(--green); }
.background-green { background-color: var(--green); }
.placeholder-green::placeholder { color: var(--green); }
.border-green {
  border-top: var(--border-width) solid var(--green);
  border-right: var(--border-width) solid var(--green);
  border-bottom: var(--border-width) solid var(--green);
  border-left: var(--border-width) solid var(--green);
}
.border-top-green { border-top: var(--border-width) solid var(--green); }
.border-right-green { border-right: var(--border-width) solid var(--green); }
.border-bottom-green { border-bottom: var(--border-width) solid var(--green); }
.border-left-green { border-left: var(--border-width) solid var(--green); }
.blue { color: var(--blue); }
.background-blue { background-color: var(--blue); }
.placeholder-blue::placeholder { color: var(--blue); }
.border-blue {
  border-top: var(--border-width) solid var(--blue);
  border-right: var(--border-width) solid var(--blue);
  border-bottom: var(--border-width) solid var(--blue);
  border-left: var(--border-width) solid var(--blue);
}
.border-top-blue { border-top: var(--border-width) solid var(--blue); }
.border-right-blue { border-right: var(--border-width) solid var(--blue); }
.border-bottom-blue { border-bottom: var(--border-width) solid var(--blue); }
.border-left-blue { border-left: var(--border-width) solid var(--blue); }
.purple { color: var(--purple); }
.background-purple { background-color: var(--purple); }
.placeholder-purple::placeholder { color: var(--purple); }
.border-purple {
  border-top: var(--border-width) solid var(--purple);
  border-right: var(--border-width) solid var(--purple);
  border-bottom: var(--border-width) solid var(--purple);
  border-left: var(--border-width) solid var(--purple);
}
.border-top-purple { border-top: var(--border-width) solid var(--purple); }
.border-right-purple { border-right: var(--border-width) solid var(--purple); }
.border-bottom-purple { border-bottom: var(--border-width) solid var(--purple); }
.border-left-purple { border-left: var(--border-width) solid var(--purple); }
.border {
  border-top: var(--border-width) solid currentColor;
  border-right: var(--border-width) solid currentColor;
  border-bottom: var(--border-width) solid currentColor;
  border-left: var(--border-width) solid currentColor;
}
.border-top { border-top: var(--border-width) solid currentColor; }
.border-right { border-right: var(--border-width) solid currentColor; }
.border-bottom { border-bottom: var(--border-width) solid currentColor; }
.border-left { border-left: var(--border-width) solid currentColor; }
.border-radius { border-radius: var(--border-radius); }
```
