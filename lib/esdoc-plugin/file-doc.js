// hack: depends on esdoc internal class
const FileDoc = require('esdoc/out/src/Doc/FileDoc').default;

/**
 * Doc class for selector code file.
 */
class SelectorFileDoc extends FileDoc {
  /** set ``testFile`` to kind. */
  _$kind() {
    this._value.kind = 'file';
  }
}

module.exports = SelectorFileDoc;
