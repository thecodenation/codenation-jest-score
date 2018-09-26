const { exec } = require('child_process');
const { readFileSync } = require('fs');

const TEST_COMMAND = './node_modules/.bin/cross-env CI=true ./node_modules/.bin/react-scripts test --env=jsdom --json 2> /dev/null';
const DEFAULT_ERROR_MESSAGE = 'Failed executing tests.';

let scoreMap;
try {
    scoreMap = JSON.parse(readFileSync('./score-map.json'));
} catch (e) {
    console.error(DEFAULT_ERROR_MESSAGE);
    process.exit(1);
}

const execCallback = (_, stdout) => {
    let testResults;
    try {
        testResults = JSON.parse(stdout).testResults;
    } catch (e) {
        console.error(DEFAULT_ERROR_MESSAGE);
        process.exit(1);
    }

    const filterInTestMap = ({name}) => scoreMap.tests
        .filter(({ path }) => name.indexOf(path) >= 0);
    const submissionTests = testResults
        .reduce((result, test) => {
            const scores = filterInTestMap(test)[0];
            if (!scores) return result;

            return result.concat({
                ...test,
                scores
            });
        }, []);

    const reduceAssertionResults = (results, { scores, totalScore }) => results
        .reduce((score, { status }, index) => {
            if (status !== 'passed') return score;
            
            return score += scores[index] * totalScore / 100;
        }, 0);
    const reduceTest = (scoreSum, { assertionResults, scores }) => 
        scoreSum += reduceAssertionResults(assertionResults, scores)
    const score = submissionTests
        .reduce(reduceTest, 0);

    console.log(JSON.stringify({ score }))    
}

exec(TEST_COMMAND, execCallback);
