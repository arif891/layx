import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

class CommandLineInterface {
    constructor(options = {}) {
        this.rl = readline.createInterface({ input, output });
        this.defaultOptions = {
            trim: true,
            retryOnError: true,
            showDefaultValue: true,
            ...options
        };
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

                const answer = await this.rl.question(`${prompt} `);
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
        this.rl.close();
    }
}

export default CommandLineInterface;

// Example usage
async function example() {
    const cli = new CommandLineInterface();

    try {
        // Basic information with defaults
        const answers = await cli.askMultipleQuestions([
            {
                question: 'What is your name?',
                key: 'name',
                default: 'Guest',
                validator: name => name.length > 0 || 'Name cannot be empty'
            },
            {
                question: 'What is your age?',
                key: 'age',
                default: '25',
                validator: age => parseInt(age) > 0 || 'Please enter a valid age'
            }
        ]);

        // Multiple choice with default
        const favoriteColor = await cli.askMultipleChoice(
            'What is your favorite color?',
            ['Red', 'Blue', 'Green', 'Yellow'],
            { default: 'Blue' }
        );

        // Multiple choice with objects and default
        const programmingLanguage = await cli.askMultipleChoice(
            'What is your preferred programming language?',
            [
                { value: 'js', label: 'JavaScript' },
                { value: 'py', label: 'Python' },
                { value: 'java', label: 'Java' },
                { value: 'cpp', label: 'C++' }
            ],
            {
                returnObject: true,
                default: 'py'
            }
        );

        // Yes/No with default
        const wantsNewsletter = await cli.askYesNo('Would you like to subscribe to our newsletter?', {
            default: true
        });

        // Display results
        console.log('\nResults:');
        console.log('-----------------');
        console.log(`Name: ${answers.name}`);
        console.log(`Age: ${answers.age}`);
        console.log(`Favorite Color: ${favoriteColor}`);
        console.log(`Preferred Programming Language: ${programmingLanguage.label} (${programmingLanguage.value})`);
        console.log(`Newsletter Subscription: ${wantsNewsletter ? 'Yes' : 'No'}`);

    } catch (error) {
        console.error('An error occurred:', error.message);
    } finally {
        cli.close();
    }

}