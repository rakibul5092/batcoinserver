const express = require('express');
const router = express.Router();
const app = require('express')();
const s3Service = require('./s3Service.js');
const sharpService = require('./sharpService.js');
const authorize = require('../../middlewares/auth');
const randomString = require('randomstring');

router.use(authorize);


/**
 * upload files to AWS S3
 */
router.post('/upload' , async(req, res) => {
    if(!req.body.files ||  req.body.files.length === 0){
        res.status(500).send({success: false, error: 'THERE IS NO FILES TO UPLOAD'})
    }
    const errors = [];
    const result = [];
    for (let i = 0; i < req.body.files.length; i++) {
        try {
            console.log(req.body.files[i].size);
            const progressiveContent = await sharpService.compressProgressive(req.body.files[i].content, req.body.files[i].type);
            const code = randomString.generate({length: 12, readable: true, capitalization: 'lowercase'});
            const randomFileName = code + '_' + req.body.files[i].name;
            const uploadedObject = await s3Service.putObject(randomFileName,  req.body.files[i].type, progressiveContent);
            result.push({url: randomFileName});
        } catch (e) {
            console.log('error while compress or upload the files : ');
            console.log(e);
            errors.push({success: false, file: req.body.files[i].name});
        }
    }
    errors.length === 0 ? res.send(result) : res.status(500).send(errors);
});



/**
 * delete file from AWS S3
 */
router.post('/delete', async function(req, res) {
    if(!req.body.filename){
        res.status(404).send({success: false, error: 'FILE NOT FOUND'})
    }
    try {
        const deletedObject = await s3Service.deleteObject(req.body.filename);
        res.json({ success: true });
    } catch (e) {
        console.log('error while delete file from s3 : ');
        console.log(e);
        res.json({ success: false });
    }
});


/**
 * delete file bulk from AWS S3
 */
router.post('/delete/bulk', async function(req, res) {
    if(!req.body.files || req.body.files.length === 0){
        res.status(404).send({success: false, error: 'FILES NOT FOUND'})
    }
    try {
        for (let i = 0; i < req.body.files.length; i++) {
            const deletedObject = await s3Service.deleteObject(req.body.files[i].filename);
        }
        res.json({ success: true });
    } catch (e) {
        console.log('error while delete file bulk from s3 : ');
        console.log(e);
        res.json({ success: false });
    }
});


module.exports=router;