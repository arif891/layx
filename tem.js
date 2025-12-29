// Complex JavaScript Test File for Syntax Highlighters
'use strict';

/* Multi-line comment with special characters
 * Testing: @param {string} value
 * Unicode: 你好 世界 🚀
 * Regex in comment: /test\d+/gi
 */

// Template literals and interpolation
const config = {
  apiUrl: `https://api.${process.env.NODE_ENV || 'development'}.example.com`,
  timeout: 5_000, // Numeric separator
  version: 1.5e-10,
  bigInt: 9007199254740991n,
  hex: 0xFF,
  octal: 0o755,
  binary: 0b1010
};

// Async/await with arrow functions
const fetchData = async (url, { retries = 3, delay = 1000 } = {}) => {
  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    return await response.json();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchData(url, { retries: retries - 1, delay: delay * 2 });
    }
    throw new Error(`Failed after ${3 - retries} attempts: ${error.message}`);
  }
};

// Classes with private fields and static methods
class DataProcessor extends EventEmitter {
  #privateField = new WeakMap();
  static #instanceCount = 0;
  
  constructor(options) {
    super();
    this.#privateField.set(this, options);
    DataProcessor.#instanceCount++;
  }
  
  static getInstanceCount() {
    return this.#instanceCount;
  }
  
  async *generateData(start, end) {
    for (let i = start; i < end; i++) {
      yield await this.#processItem(i);
    }
  }
  
  #processItem(item) {
    return Promise.resolve(item ** 2);
  }
  
  get value() { return this.#privateField.get(this); }
  set value(v) { this.#privateField.set(this, v); }
}

// Complex regex patterns
const patterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  url: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi,
  phone: /(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})/
};

// Destructuring and spread operators
const { email, url, ...restPatterns } = patterns;
const combined = { ...config, ...restPatterns, nested: { deep: { value: true } } };

// Tagged template literals
function sql(strings, ...values) {
  return strings.reduce((query, str, i) => {
    const value = values[i - 1];
    return query + (typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value ?? 'NULL') + str;
  });
}

const userId = 42;
const query = sql`SELECT * FROM users WHERE id = ${userId} AND status = ${'active'}`;

// Generators and iterators
function* fibonacci() {
  let [prev, curr] = [0, 1];
  while (true) {
    yield curr;
    [prev, curr] = [curr, prev + curr];
  }
}

// Proxy and Reflect
const observableArray = new Proxy([], {
  get(target, property, receiver) {
    console.log(`Getting ${property}`);
    return Reflect.get(target, property, receiver);
  },
  set(target, property, value, receiver) {
    console.log(`Setting ${property} to ${value}`);
    return Reflect.set(target, property, value, receiver);
  }
});

// Optional chaining and nullish coalescing
const getUserCity = (user) => user?.address?.city ?? 'Unknown';

// Dynamic imports and top-level await
const module = await import('./module.js');
const dynamicValue = await (async () => 'computed')();

// Symbol usage
const sym = Symbol('description');
const obj = {
  [sym]: 'symbol property',
  [Symbol.iterator]: function*() { yield* [1, 2, 3]; }
};

// Complex object with various features
const complexObject = {
  // Computed property names
  [`prop_${Date.now()}`]: true,
  
  // Method shorthand
  method() { return this; },
  
  // Async method
  async fetchUser(id) {
    return await fetchData(`/users/${id}`);
  },
  
  // Getter/setter
  get timestamp() { return Date.now(); },
  set timestamp(value) { this._timestamp = value; },
  
  // Arrow function property
  arrow: (x) => x * 2,
  
  // Nested object
  nested: {
    deep: {
      value: [1, 2, 3].map(x => x ** 2)
    }
  }
};

// Error handling with multiple catch clauses simulation
try {
  throw new TypeError('Type error occurred');
} catch (error) {
  if (error instanceof TypeError) {
    console.error('Type Error:', error.message);
  } else if (error instanceof ReferenceError) {
    console.error('Reference Error:', error.message);
  } else {
    console.error('Unknown Error:', error);
  }
} finally {
  console.log('Cleanup');
}

// JSX-like syntax in template strings
const component = `
  <div className="container" onClick={${() => console.log('clicked')}}>
    <h1>Title: ${config.version}</h1>
    {items.map(item => `<span key="${item.id}">${item.name}</span>`)}
  </div>
`;

// Export statements
export { fetchData, DataProcessor as Processor };
export default complexObject;
export * from './helpers.js';

/* Escaped characters and edge cases */
const edgeCases = {
  string: "Quote: \" Backslash: \\ Newline: \n Tab: \t",
  regex: /\/\*.*?\*\//g, // Comments in regex
  division: 10 / 2 / 5,  // Division vs regex ambiguity
  template: `Line 1
Line 2 with ${`nested ${`triple`} template`}`,
  unicode: '\u{1F600}', // 😀
  escaped: 'It\'s a string with "quotes"'
};