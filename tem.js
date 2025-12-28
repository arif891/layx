/**
 * THE ULTIMATE REGEX CRUSHER
 * Tests: Nested backticks, Regex-in-ternary, 
 * Labelled loops, and ASI (Automatic Semicolon Insertion) traps.
 */

const ϟ = Symbol('complex');

export class ShadowRealm extends (class { constructor(x) { this.x = x } }) {
    static #privateField = /[^/]*/.test('/') ? "div" : 5 / 2 / 1;
    
    // Test 1: The Regex/Division ambiguity in a property initializer
    isRegex = [ /[/]/, 5 / 2, /\// ].map(v => v instanceof RegExp);

    async *[ϟ](...{ 0: head, length, [length - 1]: tail }) {
        // Test 2: Destructuring with template literals as keys
        const { [`prop-${head}`]: value = `Result: ${
            // Test 3: Deeply nested template logic with internal comments
            (function*(n) {
                while(n--) yield `Value: ${n / /regex/.test(n)}`; // Division or Regex?
            })(5).next().value
        }`} = { 'prop-undefined': 'Found' };

        // Test 4: Labelled block with ASI traps
        highlighter_test: {
            if (!value) break highlighter_test;
            console.log(tail?.(head) ?? "Default");
        }

        // Test 5: The "BigInt vs. Name" and "Private Method" check
        yield 123n;
        return await this.#process.call(null, {
            data: [0xABCDEF, 0b1010, .5e-10],
            pattern: / (?:(?<=\s)|(?<=^))\/context\//gi
        });
    }

    async #process({ data, pattern }) {
        // Test 6: Arrow function with complex lookahead requirements
        const handler = async (item, { fallback = () => {} } = {}) => 
            item?.match?.(pattern) 
                ? item.replace(pattern, (match) => `${match}`) 
                : fallback(item);

        return data.reduce(async (acc, cur) => (await acc) + (await handler(cur)), "");
    }
}

// Test 7: The "Everything at Once" expression
const result = (([a, b] = [1, 2]) => a / b / ( /123/.test("123") ? 4 : 5 ))();

console.log(`Final Test: ${`Inner ${`Deepest ${/`/.source}`}`}`);