import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

class CommandLineInterface {

    constructor(options = {}) {
        this.defaultOptions = {
            trim: true,
            retryOnError: true,
            showDefaultValue: true,
            ...options
        };

        this.rl = null;

        const colors = {
            // Basic formatting
            format: {
                reset: "\x1b[0m",
                bold: "\x1b[1m",
                dim: "\x1b[2m",
                italic: "\x1b[3m",
                underscore: "\x1b[4m",
                blink: "\x1b[5m",
                reverse: "\x1b[7m",
                hidden: "\x1b[8m",
                strikethrough: "\x1b[9m"
            },

            // Foreground colors (standard)
            fg: {
                black: "\x1b[30m",
                red: "\x1b[31m",
                green: "\x1b[32m",
                yellow: "\x1b[33m",
                blue: "\x1b[34m",
                magenta: "\x1b[35m",
                cyan: "\x1b[36m",
                white: "\x1b[37m",
                // Bright variants
                brightBlack: "\x1b[90m",
                brightRed: "\x1b[91m",
                brightGreen: "\x1b[92m",
                brightYellow: "\x1b[93m",
                brightBlue: "\x1b[94m",
                brightMagenta: "\x1b[95m",
                brightCyan: "\x1b[96m",
                brightWhite: "\x1b[97m",
                // Bright variants
                brightBlack: "\x1b[100m",
                brightRed: "\x1b[101m",
                brightGreen: "\x1b[102m",
                brightYellow: "\x1b[103m",
                brightBlue: "\x1b[104m",
                brightMagenta: "\x1b[105m",
                brightCyan: "\x1b[106m",
                brightWhite: "\x1b[107m",
            },

            // Background colors (standard)
            bg: {
                black: "\x1b[40m",
                red: "\x1b[41m",
                green: "\x1b[42m",
                yellow: "\x1b[43m",
                blue: "\x1b[44m",
                magenta: "\x1b[45m",
                cyan: "\x1b[46m",
                white: "\x1b[47m",
                // Bright variants
                brightBlack: "\x1b[100m",
                brightRed: "\x1b[101m",
                brightGreen: "\x1b[102m",
                brightYellow: "\x1b[103m",
                brightBlue: "\x1b[104m",
                brightMagenta: "\x1b[105m",
                brightCyan: "\x1b[106m",
                brightWhite: "\x1b[107m",
            }
        };

        // Make colors accessible at class level
        this.colors = colors;
        this.format = colors.format;
        this.fg = colors.fg;
        this.bg = colors.bg;
    }

    getInterface() {
        if (!this.rl) {
            this.rl = readline.createInterface({ input, output });
        }
        return this.rl;
    }

    // Move style method here
    style(text, ...styles) {
        const combined = styles.join('');
        return `${combined}${text}${this.format.reset}`;
    }

    // Move rgb object as methods
    rgbFg(r, g, b) {
        return `\x1b[38;2;${r};${g};${b}m`;
    }

    rgbBg(r, g, b) {
        return `\x1b[48;2;${r};${g};${b}m`;
    }

    /**
     * Ask a single question and get the response
     * @param {string} question - The question to ask
     * @param {Object} options - Configuration options
     * @returns {Promise<string>} The user's response
     */
    async askQuestion(question, options = {}) {
        options = { ...this.defaultOptions, ...options };

        while (true) {
            try {
                let prompt = question;
                if (options.default !== undefined && options.showDefaultValue) {
                    prompt += ` (default: ${options.default})`;
                }

                const answer = await this.getInterface().question(`${prompt} `);
                const processedAnswer = options.trim ? answer.trim() : answer;

                // Return default value if answer is empty and default exists
                if (processedAnswer === '' && options.default !== undefined) {
                    return options.transform ? options.transform(options.default) : options.default;
                }

                if (options.validator) {
                    const validationResult = await options.validator(processedAnswer);
                    if (validationResult === true) {
                        return options.transform ? options.transform(processedAnswer) : processedAnswer;
                    }
                    if (typeof validationResult === 'string') {
                        console.error('\x1b[31m✗\x1b[0m', validationResult);
                        continue;
                    }
                }
                return options.transform ? options.transform(processedAnswer) : processedAnswer;
            } catch (error) {
                console.error('\x1b[31m✗\x1b[0m', error.message);
            }
        }
    }

    /**
     * Ask multiple questions in sequence
     * @param {Array<Object>} questions - Array of question configurations
     * @returns {Promise<Object>} Answers object
     */
    async askMultipleQuestions(questions) {
        const answersArray = [];
        const answersObject = {};

        for (const config of questions) {
            const answer = await this.askQuestion(config.question, {
                validator: config.validator,
                transform: config.transform,
                default: config.default
            });
            answersArray.push(answer);
            answersObject[config.key || config.question] = answer;
        }

        return Object.assign(answersArray, answersObject);
    }

    /**
     * Ask a yes/no question
     * @param {string} question 
     * @param {Object} options - Configuration options including default
     * @returns {Promise<boolean>}
     */
    async askYesNo(question, options = {}) {
        const defaultValue = options.default ? 'y' : options.default === false ? 'n' : undefined;
        const answer = await this.askQuestion(
            `${question} (y/n)`,
            {
                validator: input => {
                    const normalized = input.toLowerCase();
                    if (input === '' && defaultValue) return true;
                    if (!['y', 'n', 'yes', 'no'].includes(normalized)) {
                        return 'Please answer with y/n or yes/no';
                    }
                    return true;
                },
                transform: input => {
                    if (input === '' && defaultValue) return defaultValue === 'y';
                    return ['y', 'yes'].includes(input.toLowerCase());
                },
                default: defaultValue
            }
        );
        return answer;
    }

    /**
     * Ask a question with multiple choice options
     * @param {string} question - The main question to ask
     * @param {Array<string|Object>} choices - Array of choices
     * @param {Object} options - Additional options including default
     * @returns {Promise<string|Object>} Selected choice
     */
    async askMultipleChoice(question, choices, options = {}) {
        // Format and display the question and choices
        console.log(`\n${question}`);

        const formattedChoices = choices.map((choice, index) => {
            if (typeof choice === 'object') {
                return { value: choice.value, label: choice.label, index: index + 1 };
            }
            return { value: choice, label: choice, index: index + 1 };
        });

        // Display choices and mark default if it exists
        formattedChoices.forEach(choice => {
            const defaultMarker = options.default === choice.value ? ' (default)' : '';
            console.log(`  ${choice.index}) ${choice.label}${defaultMarker}`);
        });

        // Find default index if default value is provided
        const defaultIndex = options.default ?
            formattedChoices.findIndex(c => c.value === options.default) + 1 :
            undefined;

        // Ask for user's choice
        const answer = await this.askQuestion('Enter your choice (number):', {
            validator: (input) => {
                if (input === '' && defaultIndex) return true;
                const num = parseInt(input);
                if (isNaN(num)) {
                    return 'Please enter a valid number';
                }
                if (num < 1 || num > choices.length) {
                    return `Please enter a number between 1 and ${choices.length}`;
                }
                return true;
            },
            transform: (input) => {
                const index = input === '' ? defaultIndex - 1 : parseInt(input) - 1;
                const choice = formattedChoices[index];
                return options.returnObject ? choice : choice.value;
            },
            default: defaultIndex?.toString()
        });

        return answer;
    }

    close() {
        if (this.rl) {
            this.rl.close();
            this.rl = null;
        }
    }
}

export default CommandLineInterface;
