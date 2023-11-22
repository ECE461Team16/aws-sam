import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import AdmZip from 'adm-zip';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

function getZipData(binaryData: Buffer): [string, string] | null {
    const zip = new AdmZip(binaryData);
    const zipEntries = zip.getEntries();

    if (zipEntries.length > 0) {
        let repository = '';
        let name = '';

        zipEntries.forEach((zipEntry) => {
            if (zipEntry.entryName === `smallest-master/package.json`) {
                // console.log(zipEntry.getData().toString('utf8'));
                name = JSON.parse(zipEntry.getData().toString('utf8')).name;
                repository = JSON.parse(zipEntry.getData().toString('utf8')).repository;
                console.log(`repository: ${repository}`);
                // const repository = packJson.;
                // console.log(zipEntry.entryName);
            }
        });

        return [name, repository];
    } else {
        console.log('no zip file found');
        return null;
    }
}

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const content = JSON.parse(JSON.stringify(event)).Content;

        // convert base64 variable content to zip
        const binaryData: Buffer = Buffer.from(content, 'base64');

        // get the name of the zip file in binaryData
        let [name, repository] = getZipData(binaryData)?.slice(0, -1) || ['', ''];
        name = name.split('/')[0];
        repository = repository;
        if (name == '') {
            throw new Error('zip file error');
        }
        console.log(`repository ${repository}`);

        // TODO: get the package github url
        const githubUrl = `github.com/${repository}`;
        // TODO: rate the package
        // TODO: make sure the package is not already in the database
        // TODO: store package metadata in dynamodb

        // upload zip to s3
        const s3 = new AWS.S3();
        const params = {
            Bucket: 'ingested-package-storage',
            Key: `${name}.zip`,
            Body: binaryData,
        };
        console.log(`storing package: `, params.Key);
        await s3
            .upload(params, (err: Error, data: any) => {
                console.log(err, data);
            })
            .promise();

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `test`,
            }),
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: err,
            }),
        };
    }
};
