var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongoose_delete = require('mongoose-delete');

var schema = new Schema({
    slug: String,
    title: { en: String, fr: String, es: String },
    subTitle: { en: String, fr: String, es: String },
    description: { en: String, fr: String, es: String },
    category: { en: String, fr: String, es: String },  
    imageUrl: String,
    backPath: String,
    prevPrice: Number,
    currentPrice: Number,
    progressiveImages: [{
        url: String,
        label: String,
        active: Boolean,
    }],
    active: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    created_at: Date,
    updated_at: Date,
    index: { type: Number, default: 0 },
    parcel: {
        pLength: { type: Number, default: 1 },
        width: { type: Number, default: 1 },
        height: { type: Number, default: 1 },
        weight: { type: Number, default: 1 }
    }
});

schema.plugin(mongoose_delete, { deleted_at: true });

schema.pre('save', function (next) {
    var currentDate = new Date();
    if (!this.created_at) {
        this.created_at = currentDate;
    } else {
        this.updated_at = currentDate;
    }
    next();
});

schema.pre('remove', function (next) {
    if (this.isDeleted) {
        this.delete().catch(e => {
            console.log("permanently removed the product");
        });
    } else {
        setDocumentIsDeleted(this);
    }
    next();
});

const setDocumentIsDeleted = (doc) => {
    doc.isDeleted = true;
    doc.deleted_at = new Date();
    doc.$isDeleted(true);
    doc.save();
};

module.exports = mongoose.model('products', schema);