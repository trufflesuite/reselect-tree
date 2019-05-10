import { createSelectorTree, createLeaf } from "../lib";
import { expect } from "chai";

describe("createSelectorTree", () => {
  const select = createSelectorTree({
    shop: {
      _: createLeaf(
        ['./info'], ({ name }) => ({ name })
      ),

      info: ({ shop: { name } }) => ({ name }),

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
        ['./subtotal', './tax'], (subtotal, tax) => subtotal + tax
      )
    },
    buyer: {
      _: ({ buyer: { name } }) => ({ name })
    }
  });


  let state = {
    shop: {
      name: "Fruit Stand",
      taxPercent: 8,
    },
    cart: {
      items: [
        { name: 'apple', value: 1.20 },
        { name: 'orange', value: 0.95 },
      ]
    },
    buyer: {
      name: "Abernacky Fidelius"
    }
  }

  let expectedCart = {
    items: [...state.cart.items],
    subtotal: 2.15,
    tax: 0.172,
    total: 2.322
  };

  it("selects leaf nodes correctly", () => {
    expect(select.cart.subtotal(state)).to.equal(expectedCart.subtotal);
    expect(select.cart.tax(state)).to.equal(expectedCart.tax);
    expect(select.cart.total(state)).to.equal(expectedCart.total);
  });

  it("selects aggregate nodes correctly", () => {
    expect(select.cart(state)).to.deep.equal(expectedCart);
  });

  it("selects root (_) leaf nodes correctly", () => {
    expect(select.shop(state)).to.deep.equal({ name: state.shop.name });
  });

  it("selects root (_) function nodes correctly", () => {
    expect(select.buyer(state)).to.deep.equal({ name: state.buyer.name });
  });

});
