// Import the AWS SDK and create a Lambda client
const AWS = require('aws-sdk');
const lambda = new AWS.Lambda();




exports.handler = async (event) => {
    // Read the concurrency level from the event
    const concurrency = event.concurrency || 15;

    // Array to hold promises for all the concurrent invocations
    let promises = [];

    // Function name of the Lambda to invoke
    const targetFunctionName = process.env.LAMBDA_FUNCTION_NAME;

    if (!targetFunctionName) {
        console.error('LAMBDA_FUNCTION_NAME environment variable is not set');
        return {
            statusCode: 500,
            body: JSON.stringify('LAMBDA_FUNCTION_NAME environment variable is not set')
        };
    }

    // Loop to invoke the Lambda function concurrently based on the concurrency level
    for (let i = 0; i < concurrency; i++) {
        const params = {
            FunctionName: targetFunctionName,
            InvocationType: 'Event', // Asynchronous invocation
            Payload: JSON.stringify({"source":"warmup"})
        };

        // Invoke the Lambda function and add the promise to the array
        const promise = lambda.invoke(params).promise();
        promises.push(promise);
    }

    // Wait for all Lambda functions to be invoked
    try {
        await Promise.all(promises);
        console.log(`Successfully invoked ${concurrency} instances of ${targetFunctionName}`);
        return {
            statusCode: 200,
            body: JSON.stringify(`All ${concurrency} functions invoked successfully.`)
        };
    } catch (error) {
        console.error('Error invoking functions:', error);
        return {
            statusCode: 500,
            body: JSON.stringify(`Failed to invoke functions: ${error.message}`)
        };
    }
};
