const debug = require("debug")("reselect-tree:esdoc-plugin:factory");
const assert = require('assert');
const Doc = require('./doc');
const FileDoc = require('./file-doc');
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

    // file doc
    const doc = new FileDoc(ast, ast, pathResolver, []);
    this._results.push(doc.value);
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
   * match node for conforming as selector to document
   */
  _match(node) {
    var expression;
    var name;
    var iface;

    /* match node for possible signified types */
    switch (node.type) {
      case "ExpressionStatement":
        expression = node.expression;
        break;

      case "ObjectProperty":
        expression = node;
        break;

      case "VariableDeclaration":
        if (node.declarations.length > 0) {
          expression = node.declarations[0];
        }
        break;

      default:
        return null;
        // debug("skipping node type %s", node.type);
    }

    debug("node %s %O", node.type, node);

    if (!expression) return null;

    debug("expression %s %O", expression.type, expression);

    /* match left-hand side if exists */
    switch (expression.type) {
      case "AssignmentExpression":
        name = expression.left.name;
        expression = expression.right;
        break;

      case "VariableDeclarator":
        name = expression.id.name;
        expression = expression.init;
        break;

      case "ObjectProperty":
        name = expression.key.name;
        expression = expression.value;
        break;
    }

    debug("name %s", name);

    if (!expression) return null;

    /* match right hand side */
    switch (expression.type) {
      case "ArrowFunctionExpression":
        iface = "<arrow>";
        break;

      case "FunctionExpression":
        iface = "<function>";
        break;

      case "CallExpression":
        iface = expression.callee.name;
        break;

      case "ObjectExpression":
        iface = "<subtree>";
        break;

      default:
        return null;
    }

    debug("interface %s", iface);

    if (!this._interfaces.includes(iface)) return;

    return {
      "expression": expression,
      "name": name
    };
  }

  /**
   * push node as selector code.
   * @param {ASTNode} node - target node.
   * @private
   */
  _push(node) {
    const match = this._match(node);
    if (!match) return;

    const expression = match.expression;
    const name = match.name;

    expression[already] = true;
    Reflect.defineProperty(expression, 'parent', {value: node});

    let tags = [];
    if (node.leadingComments && node.leadingComments.length) {
      const comment = node.leadingComments[node.leadingComments.length - 1];
      tags = CommentParser.parse(comment);
    }

    const uniqueId = this.constructor._getUniqueId();
    expression._esdocSelectorId = uniqueId;
    expression._esdocSelectorName = name + uniqueId;

    const selectorDoc = new Doc(this._ast, expression, this._pathResolver, tags);

    this._results.push(selectorDoc.value);
  }
}

module.exports = DocFactory;
