const patterns = ["1a2b", "2a3b"];

exports.handler = async function (event, context) {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const patternIndex = dayOfYear % patterns.length;
    const pattern = patterns[patternIndex];

    return {
    statusCode: 200,
    body: JSON.stringify({ pattern: pattern }),
    };
};