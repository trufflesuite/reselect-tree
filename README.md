reselect-tree
=============

Wrapper around reactjs's [reselect](https://github.com/reactjs/reselect)
library for creating trees of selectors.


Usage Example
=============

Install with:

```
npm install --save reselect-tree
```


Then define a file `selectors.js`:

```javascript
import { createSelectorTree, createLeaf } from "reselect-tree";

const select = createSelectorTree({
  shop: {
    taxPercent: state => state.shop.taxPercent
  },
  cart: {
    items: state => state.cart.items,

    subtotal: createLeaf(
      ['./items'],

      (items) => items.reduce((acc, item) => acc + item.value, 0)
    ),

    tax: createLeaf(
      ['/shop/taxPercent', './subtotal'],

      (taxPercent, subtotal) => subtotal * (taxPercent / 100)
    ),

    total: createLeaf(
      ['./subtotal', './tax'], (subtotal, tax) => ({ total: subtotal + tax })
    )
  }
});


let exampleState = {
  shop: {
    taxPercent: 8,
  },
  cart: {
    items: [
      { name: 'apple', value: 1.20 },
      { name: 'orange', value: 0.95 },
    ]
  }
}

console.log(select.cart.subtotal(exampleState)) // 2.15
console.log(select.cart.tax(exampleState))      // 0.172
console.log(select.cart.total(exampleState))    // { total: 2.322 }
```
