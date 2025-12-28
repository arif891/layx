// 1. Core Logic (Logic for inside Strings/Subshells)
const subRules = [
    // Standard Built-ins
    { 
        type: 'func', 
        match: /\b(echo|date|pwd|ls|command|grep|sed|awk|diff|cat|sudo|cd|mkdir|rm|cp|mv|comm|sort|printf)\b/g 
    },
    // Floats & Integers
    { type: 'num', match: /\b\d+(\.\d+)?\b/g },
    // Control Flow & Keywords
    { 
        type: 'kwd', 
        match: /\b(in|let|local|declare|export|do|done|then|fi|if|for|while|return|exit|case|esac)\b/g 
    },
    // Operators
    { type: 'oper', match: /[!@%*?#:-]|[\[\]]|[=+\-*/<>|&!^]+/g }, 
    { type: 'var', match: /[a-zA-Z_][a-zA-Z0-9_]*/g }
];

// 2. Recursive Variable Definition
const variable = {
    type: 'var',
    // Matches $VAR, ${VAR}, $(...), and $((...))
    match: /\$\w+|\$\{(?:[^}\\]|\\.)*\}|\$\((?:[^)(]|\([^)(]*\))*\)|\$\(\(.*\)\)/g,
    sub: subRules 
};

// 3. Robust String Definitions
const doubleQuoteStr = { 
    type: 'str', 
    // FIX: (\\[\s\S]) matches backslash followed by ANY char (including newlines)
    // FIX: [^"\\] matches any non-quote, non-backslash
    match: /"(\\[\s\S]|[^"\\])*"/g, 
    sub: [ variable ] 
};

const singleQuoteStr = { type: 'str', match: /'[^']*'/g };

// Update Recursion
subRules.push(doubleQuoteStr);
subRules.push(singleQuoteStr); 

export default [
    { type: 'kwd', match: /^#!.*/g }, // Shebang
    { type: 'cmnt', match: /(^|\s)#.*/g }, // Comments
    
    // Heredocs
    // FIX: Enforce delimiter to start with a letter (avoids matching bitwise << 2)
    { type: 'str', match: /<<\s*(['"])([a-zA-Z_][\w-]*)\1[\s\S]*?^\2$/gm },
    { type: 'str', match: /<<-?\s*([a-zA-Z_][\w-]*)[\s\S]*?^\1$/gm, sub: [ variable ] },

    // Strings
    singleQuoteStr,
    doubleQuoteStr,

    // Process Substitution <(...) - Must be before generic operators
    { type: 'oper', match: /<(?=\()/g },

    // Assignment
    { type: 'var', match: /(?<=^|\s|[|&;])[a-zA-Z_][a-zA-Z0-9_]*(?==)/g },
    
    variable,

    // Keywords
    {
        type: 'kwd',
        match: /\b(function|local|unset|readonly|shift|export|if|fi|else|elif|while|do|done|for|until|case|esac|break|continue|exit|return|trap|wait|eval|exec|then|declare|enable|select|typeset|time|EOF|EXPECTED|let|in)\b/g
    },
    
    // Flags (-f, --help)
    { type: 'kwd', match: /(?<=^|\s|\[)--?[a-zA-Z0-9-]+(?=\s|$|\])/g },
    { type: 'bool', match: /(?<=^|\s)(true|false)(?=\s|$)/g },

    // Arithmetic Blocks 
    // FIX: Use .*? (lazy match) to prevent eating multiple blocks on one line
    // FIX: Use [\s\S] to allow arithmetic to span multiple lines if needed
    {
        type: 'oper',
        match: /\(\([\s\S]*?\)\)|\[\[[\s\S]*?\]\]|[=(){}<>!|&]+/g,
        sub: [...subRules, variable] 
    },
    
    // Function Definitions
    { type: 'func', match: /(?<=function\s+)[a-z_][a-z0-9_.-]*/gmi },
    { type: 'func', match: /(?<=^|\s)[a-z_][a-z0-9_.-]*(?=\s*\(\))/gmi },

    // General Function Calls
    {
        type: 'func',
        match: /(?<=^|\||&&|;|do\s+|then\s+)\b(?!(?:if|fi|else|elif|while|do|done|for|until|case|esac|break|continue|exit|return|then|local|declare|in|let)\b)[a-z_][a-z0-9_.-]*\b/gm
    },

    { type: 'num', match: /\b\d+\b/g }
];