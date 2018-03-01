const debug = require("debug")("reselect-tree:esdoc-plugin:factory");
const assert = require('assert');
const Doc = require('./doc');
// hack: depends on ESDoc internal class
const CommentParser = require('esdoc/out/src/Parser/CommentParser').default;

const already = Symbol('already');

/**
 * Selector doc factory class.
 * @example
 * let factory = new DocFactory('mocha', ast, pathResolver);
 * factory.push(node, parentNode);
 * let results = factory.results;
 */
class DocFactory {
  /**
   * get unique id.
   * @returns {number} unique id.
   * @private
   */
  static _getUniqueId() {
    if (!this._sequence) /** @type {number} */ this._sequence = 0;

    return this._sequence++;
  }

  /**
   * @type {DocObject[]}
   */
  get results() {
    return [...this._results];
  }

  /**
   * create instance.
   * @param {string[]} interfaces - selector interface names.
   * @param {AST} ast - AST of selector code.
   * @param {PathResolver} pathResolver - path resolver of selector code.
   */
  constructor(interfaces, ast, pathResolver) {
    /** @type {string} */
    this._interfaces = interfaces;

    /** @type {AST} */
    this._ast = ast;

    /** @type {PathResolver} */
    this._pathResolver = pathResolver;

    /** @type {DocObject[]} */
    this._results = [];
  }

  /**
   * push node, and factory process the node.
   * @param {ASTNode} node - target node.
   * @param {ASTNode} parentNode - parent node of target node.
   */
  push(node, parentNode) {
    if (node[already]) return;

    node[already] = true;
    Reflect.defineProperty(node, 'parent', {value: parentNode});

    this._push(node);
  }

  /**
   * push node as selector code.
   * @param {ASTNode} node - target node.
   * @private
   */
  _push(node) {
    if (node.type !== 'ExpressionStatement') return;

    const expression = node.expression;
    if (expression.type !== 'CallExpression') return;

    if (!this._interfaces.includes(expression.callee.name)) return;

    expression[already] = true;
    Reflect.defineProperty(expression, 'parent', {value: node});

    let tags = [];
    if (node.leadingComments && node.leadingComments.length) {
      const comment = node.leadingComments[node.leadingComments.length - 1];
      tags = CommentParser.parse(comment);
    }

    const uniqueId = this.constructor._getUniqueId();
    expression._esdocSelectorId = uniqueId;
    expression._esdocSelectorName = expression.callee.name + uniqueId;

    const selectorDoc = new Doc(this._ast, expression, this._pathResolver, tags);

    this._results.push(selectorDoc.value);
  }
}

module.exports = DocFactory;
