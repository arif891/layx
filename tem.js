/**
 * THE SYNTACTIC LABYRINTH - Stress Test v4.0
 * Focus: Logical Assignment, Nullish Coalescing, and Object Shorthand Traps.
 */

import { parser as ϟ } from "./engine.js";

export const { config: { [ϟ ?? 'default']: crusher } = {} } = await import("./meta.js");

export default class Reflector extends (class { static name = "Base" }) {
    static #metadata = new Map();

    // Test 1: Logical assignment with regex results
    async #analyze(input, { mode = "strict" } = {}) {
        let status = null;
        
        // Test 2: The "Nullish Assignment" Trap
        // If status is null, assign the result of a regex test
        status ??= /^[a-z]+$/i.test(input) ? "valid" : "invalid";

        const results = {
            // Test 3: Object shorthand with keywords and optional chaining
            [status]: status?.length,
            // Test 4: Nested arrow functions as property values
            process: (data) => data?.map?.(v => v / 2 / /abc/.source.length) ?? [],
            // Test 5: The "Await-Regex" Ambiguity
            data: await /async-data/.test(input) ? [1_000, 2_000] : [0xABC, 0b101]
        };

        return { ...results, timestamp: Date.now() };
    }

    // Test 6: Static blocks with labelled loops and ASI traps
    static {
        init: {
            try {
                const test = (a, b) => a / b;
                if (test(1, 2) === 0.5) break init;
            } catch (e) {
                throw /init_error/;
            }
        }
    }

    // Test 7: Generator with yield-star and complex expressions
    async *[Symbol.asyncIterator]() {
        const items = [1n, 2n, 3n];
        // Test 8: Yielding a regex result vs division
        yield* items.map(n => n / 2n / /divisor/.test(n));
    }
}

// Test 9: The "Double-Backtick" recursive singularity
const msg = `Level 1: ${ `Level 2: ${ /`/.test("`") ? `Level 3: ${ 1 / 2 }` : 'fail' }` }`;

// Test 10: Composed lookahead for method detection
const handler = {
    // Is 'async' a keyword or a property here? 
    async async(x) { return await x; },
    // Regex following a method name
    check: /regex/.test("string") && void 0 / 1
};

console.log(msg, handler.check);