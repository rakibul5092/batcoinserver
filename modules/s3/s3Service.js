const aws = require('aws-sdk');
const config = require('../../config');
const s3 = new aws.S3();

var AWS_ACCESS_KEY = config[process.env.MODE].aws.access_key;
var AWS_SECRET_KEY = config[process.env.MODE].aws.secret_key;
var AWS_REGION = config[process.env.MODE].aws.region;
var S3_BUCKET = config[process.env.MODE].aws.bucket_name;

aws.config.update({ accessKeyId: AWS_ACCESS_KEY, secretAccessKey: AWS_SECRET_KEY });
aws.config.region = AWS_REGION;


module.exports = {
    /**
     * get file from s3
     * @param Key is the file name
     * @returns {Promise}
     */
    getObject: async function getObject(Key) {
        return await s3.getObject({Bucket: S3_BUCKET, Key: Key}).promise();
    },

    /**
     * upload file to s3
     * @param Key is the file name
     * @param ContentType is the file type
     * @param body is the file content
     * @returns {Promise}
     */
    putObject: async function putObject(Key, ContentType, body) {
        const s3_put_params = {
            Bucket: S3_BUCKET,
            Key: Key,
            ContentType: ContentType,
            Body: body
        };
        return await s3.putObject(s3_put_params).promise();
    },

    /**
     * delete file from s3
     * @param Key is the file name
     * @returns {Promise}
     */
    deleteObject : async function deleteObject(Key) {
        return await s3.deleteObject({Bucket: S3_BUCKET, Key: Key}).promise();
    }
};