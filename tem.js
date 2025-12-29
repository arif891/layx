/**
 * Syntax Highlighter Stress Test
 * @author Gemini
 */

import { EventEmitter } from 'events';

const GLOBAL_SYMBOL = Symbol('test_highlighter');
const REGEX_COMPLEX = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/gi;

// Testing Template Literals & Interpolation
const greeting = (name) => `Hello, ${name}! 
  This is a multiline string test.
  Math: ${10 + 20 / 5}`;

/**
 * Main Class to test OOP syntax
 */
export default class HighlighterTester extends EventEmitter {
  #privateField = 42;
  static VERSION = '1.0.0';

  constructor(options = {}) {
    super();
    this.options = { ...options, enabled: true };
    this.data = [null, undefined, true, false, Infinity, NaN];
  }

  // Testing Async/Await and Try-Catch
  async processData(input) {
    try {
      const response = await fetch(`https://api.example.com/v1/${input}`);
      const result = await response.json();
      
      this.emit('success', {
        id: result?.id ?? 'default_id', // Optional chaining & Nullish coalescing
        timestamp: Date.now()
      });
    } catch (error) {
      console.error(`Error: ${error.message}`);
      throw new Error("Processing failed.");
    }
  }

  // Testing Bitwise and Logic operators
  runCheck(val) {
    const bitwise = (val << 2) | (0xFF & 0b1010);
    const ternary = val > 0 ? "positive" : "negative";
    
    // Testing object shorthand and dynamic keys
    return {
      bitwise,
      ternary,
      [GLOBAL_SYMBOL]: typeof val,
      ["key_" + 1]: "dynamic"
    };
  }
}

// Testing Generator functions
function* sequenceGenerator() {
  yield 1;
  yield* [2, 3];
  return 4;
}

// Testing closures and higher-order functions
const factory = (multiplier) => (num) => num * multiplier;
const doubler = factory(2);

// Final edge case: Regex inside a function call
console.log("Test matches: ", "test@example.com".match(/[^@]+@[^@]+/));