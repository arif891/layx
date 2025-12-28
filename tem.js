
/**
 * Syntax Highlighter Stress Test
 * Testing: Regex, Template Literals, Classes, and Async logic.
 */

import DefaultExport, { NamedExport as Alias } from 'node:events';

const SYMBOL_KEY = Symbol('__highlighter_test__');

class TestBench extends Alias {
  #privateField = 42;
  static staticField = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/g;

  constructor(options = {}) {
    super();
    this.config = { 
      timeout: options?.timeout ?? 1000,
      enabled: true 
    };
  }

  async *generateData(items) {
    for (const item of items) {
      // Testing template literal nesting and escapes
      yield `Processing: ${item} (Index: ${items.indexOf(item)}) \`Inner Backtick\``;
      
      try {
        await new Promise(r => setTimeout(r, this.#privateField));
      } catch (err) {
        console.error(err?.message || 'Unknown error');
      }
    }
  }

  calculate(val) {
    // Testing operators and multi-line logic
    return val << 2 >>> 1 !== 10 ? (val ** 2) : Math.sqrt(val);
  }
}

// Testing Regex vs Division ambiguity
const regexTest = / \/ /g.test(" / "); 
const divisionTest = 10 / 2 / 5;

const complexObject = {
  get [SYMBOL_KEY]() {
    return "Dynamic Key Content";
  },
  "quoted-property": true,
  nullValue: NaN,
  undefinedValue: undefined,
  bigInt: 9007199254740991n
};

/*
  Block comment with 
  // Nested single line comment
  var shouldNotBeHighlightedAsKeyword = true;
*/

(async function main() {
  const bench = new TestBench({ timeout: 500 });
  const data = ["Alpha", "Beta", "Gamma"];

  for await (const status of bench.generateData(data)) {
    console.log(`%c ${status}`, "color: #00ff00; font-weight: bold;");
  }
  
  const result = bench.calculate(divisionTest?.toString().length ?? 0);
  console.log(`Final result: ${result}`);
})();