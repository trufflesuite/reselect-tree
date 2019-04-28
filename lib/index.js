import debugModule from "debug";
const debug = debugModule("reselect-tree");

import "source-map-support/register";

import { createSelector, createStructuredSelector } from "reselect";
import jsonpointer from "json-pointer";
import path from "path";

/**
 * Create a single memoized selector for a collection of named sub-selectors.
 * Behaves like `createStructuredSelector` but also allows direct invocation
 * of child selectors.
 *
 * For example:
 *
 *   const shop = createNestedSelector({
 *     items: (state) => state.items,
 *     promos: (state) => state.promos
 *   });
 *
 * Results in three selectors:
 *
 *   shop(state) ==> { items: state.items, promos: state.items }
 *   shop.items(state) => state.items
 *   shop.promos(state) => state.promos
 *
 * Override `rootSelector` to change behavior of top-level (i.e. `shop(state)`
 * in example.)
 *
 * @param {Object} selectors - object description of selector funcs
 * @param {Selector} rootSelector - specify root selector instead of aggregation
 * @return Selector
 */
export function createNestedSelector (selectors, rootSelector = null) {
  let selector;

  if (!rootSelector) {
    // unspecified means default to structured aggregation
    selector = createStructuredSelector(selectors);

  } else if (!(rootSelector instanceof Object) || !rootSelector.resultFunc) {
    // rootSelector isn't already a selector, or it's not an object...
    // forward to `createSelector()`
    selector = createSelector(rootSelector);
  } else {
    // otherwise, just use as is
    selector = rootSelector;
  }

  // add properties for child selectors
  Object.keys(selectors).forEach( (prop) => {
    selector[prop] = selectors[prop];
  });

  return selector;
}

class Leaf {
  constructor(deps, selector) {
    this.deps = deps;
    this.selector = selector;
  }

  contextualize(resolve, pointer) {
    let resolved = this.deps
      .map( (dep) => {
        if (typeof dep == 'string') {
          if (dep == "") {
            dep = "/";
          }

          let abspath = path.posix.resolve(pointer, "..", dep);

          return (...args) => {
            debug("args: %o", args);
            let selector = resolve(abspath);
            debug("resolved selector: %o", selector);
            let result = selector.apply(selector, args);
            debug("result: %o", result);
            return result;
          }
        }

        return dep;
      });

    return createSelector(resolved, this.selector);
  }
}

export function createLeaf(deps, selector) {
  return new Leaf(deps, selector);
}

class Tree {
  setRoot(root) {
    this.root = root;
  }

  resolve(abspath) {
    var resolved;
    try {
      let parsed = jsonpointer.parse(abspath);

      let cur = this.root;
      for (let step of parsed) {
        cur = cur[step];
      }

      return cur;

    } catch (e) {
      debug("failed, root: %O", this.root);
      throw e;
    }

    return resolved;
  }
}

export function createSelectorTree (root) {
  let tree = new Tree();

  let selector = _createNode(root, tree.resolve.bind(tree), "");

  tree.setRoot(selector);

  return selector;
}

/**
 * Recursively create a selector node in the tree, applying context to nodes
 * as needed.
 */
function _createNode(node, resolve, pointer = "") {
  //based on type of node, operate differently
  if (node instanceof Function) {
    // plain functions are converted to contextualized Leaf nodes
    return createLeaf([state => state], node).contextualize(resolve, pointer);

  } else if (node instanceof Leaf) {
    // explicit leaf nodes just need context resolution for relative deps
    return node.contextualize(resolve, pointer);

  } else if (node instanceof Object) {
    // otherwise, node is an object, so recurse
    const recurse =
      (key, child) => _createNode(child, resolve, `${pointer}/${key}`);

    let selectors = Object.assign({},
      ...Object.entries(node)
        .map( ([key, child]) => ({ [key]: recurse(key, child) }) )
    );

    // special-case `_` child nodes override root selector
    const rootSelector = selectors._ || null;

    return createNestedSelector(selectors, rootSelector);

  } else {
    // other types are not allowed
    throw new Error(
      `Invalid node in selector tree at ${pointer}. ` +
      `Must be function, leaf, or object. Received: ${node}`
    );
  }
}
