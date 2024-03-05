const buffer = require('buffer');
const sharp = require('sharp');
module.exports = {

    /**
     * compress file using sharp and with progressive
     * @param content
     * @param type
     * @returns {Promise}
     */
    compressProgressive: async function (content, type) {
        const Buffer = buffer.Buffer;
        switch (type) {
            case 'image/jpeg': {
                return await sharp(Buffer.from(content, 'base64'))
                    .jpeg({quality: 50, progressive: true, force: true, optimiseScans : true, mozjpeg: true})
                    .toBuffer();
            }
            case 'image/png': {
                return await sharp(Buffer.from(content, 'base64'))
                    .png({quality: 50, progressive: true, force: true})
                    .toBuffer();
            }
            case 'image/webp': {
                return await sharp(Buffer.from(content, 'base64'))
                    .webp({quality: 50, progressive: true, force: true, lossless: true})
                    .toFormat('webp')
                    .toBuffer();
            }
        }
    }
};

function fileSize(size) {
    var i = Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}