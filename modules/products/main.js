var Products=require('./models.js');
var controller=require('./controllers');
var async=require('async');
var mongoose=require('mongoose');
var app=require('express')();
const authorize=require('../../middlewares/auth');
const emitModuleChangeEvent = require("../../middlewares/moduleChange");
const config = require('../../config');
const aws = require('aws-sdk');
const Buffer = require('buffer').Buffer;
const sharp = require('sharp');




var AWS_ACCESS_KEY = config[process.env.MODE].aws.access_key;
var AWS_SECRET_KEY = config[process.env.MODE].aws.secret_key;
var AWS_REGION = config[process.env.MODE].aws.region;
var S3_BUCKET = config[process.env.MODE].aws.bucket_name;


aws.config.update({ accessKeyId: AWS_ACCESS_KEY, secretAccessKey: AWS_SECRET_KEY });
aws.config.region = AWS_REGION;


emitModuleChangeEvent(controller, 'products');

controller.put('/order' , async (req, res) => {
    async.eachSeries(req.body.products, function updateObject(product, callback) {
        Products.update({ _id: product._id }, { $set : product}, callback);
    }, function allDone (err) {
        if (err) {
            res.status(500);
        } else {
            res.status(200).json(req.body.products);
        }
    });
});

controller.request('post', authorize);
controller.request('put', authorize);
controller.request('delete', authorize);

controller.request('delete', function(req, res, next) {
    if (req.params.id) {
        next();
        var user = req.user;
        if (user) {
            req.body.deleted = true;
            req.body.deleted_by = user.user_id;
            req.body.deleted_on = new Date().getTime();
        }
    } else {
        next(new Error("Invalid delete request"));
    }
});


controller.post('/migrate/progressive/images', async (req, res) => {
    const products = await Products.find({});
    const s3 = new aws.S3();
    for (let i = 0; i < products.length; i++) {
        products[i].imageUrl = await migrateProgressiveImage(products[i]._id, products[i].imageUrl, s3);
        products[i].backPath = await migrateProgressiveImage(products[i]._id, products[i].backPath, s3);
        const progressiveImages = [];
        progressiveImages.push({url: products[i].imageUrl, active : true, label: 'imageUrl'});
        progressiveImages.push({url: products[i].backPath, active : true, label: 'backPath'});
        if (products[i].progressiveImages) {
            for (let j = 0; j < products[i].progressiveImages.length; j++) {
                const progressiveImage = await migrateProgressiveImage(products[i]._id, products[i].progressiveImages[j].url, s3);
                progressiveImages.push({url: progressiveImage, active : true, label: 'active'});
            }
        }
        let doc = await Products.findOneAndUpdate({_id: products[i]._id}, {
            progressiveImages: progressiveImages,
            imageUrl: products[i].imageUrl,
            backPath: products[i].backPath
        });
    }
    res.status(200).json({success: true, msg: "All PRODUCTS PROGRESSIVE IMAGES MIGRATED SUCCESSFULLY"});
});


controller.get('/migrate/progressive/sharp', async (req, res) => {
    const products = await Products.find({title: "test"});
    const s3 = new aws.S3();
    for (let i = 0; i < products.length; i++) {
        products[i].imageUrlProgressive = await migrateProgressiveImage(products[i]._id, products[i].imageUrl, s3);
        products[i].backPathProgressive = await migrateProgressiveImage(products[i]._id, products[i].backPath, s3);
        const progressiveImages = [];
        if (products[i].images) {
            for (let j = 0; j < products[i].images.length; j++) {
                const progressiveImage = await migrateProgressiveImage(products[i]._id, products[i].images[j], s3);
                progressiveImages.push({url: products[i].images[j], urlProgressive: progressiveImage});
            }
        }
        let doc = await Products.findOneAndUpdate({_id: products[i]._id}, {
            progressiveImages: progressiveImages,
            imageUrlProgressive: products[i].imageUrlProgressive,
            backPathProgressive: products[i].backPathProgressive
        });
    }
    res.status(200).json({success: true, msg: "All PRODUCTS PROGRESSIVE IMAGES MIGRATED SUCCESSFULLY"});
});




async function migrateProgressiveImage(productId, image, s3) {
    if (!image) {
        return '';
    }
    try {
        const file = await s3.getObject({Bucket: S3_BUCKET, Key: image}).promise();
        if (file.Body) {
            console.log('file.key' , image);
            const s3_put_params = {
                Bucket: S3_BUCKET,
                Key: 'sharp_progressive_' + image,
                ContentType: file.ContentType,
                Body: null
            };
            s3_put_params.Body = await
                sharp(Buffer.from(file.Body))
                    .jpeg({ quality: 50, progressive: true, force: false, lossless: true })
                    .png({ quality: 50, progressive: true, force: false, lossless: true })
                    .webp({quality: 50,  progressive: true, force: false, lossless: true })
                    .toBuffer();
            const progressiveFile = await s3.putObject(s3_put_params).promise();
            return 'progressive' + image;
        } else{
            console.log('no image found on s3');
            return '';
        }
    } catch (err) {
        console.log(`S3 error while migrate ::: Product ( ${productId} ) image ::: ( ${image} ) ::: ${err.message}`);
        return '';
    }
}