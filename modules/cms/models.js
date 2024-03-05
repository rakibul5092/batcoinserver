var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var mongoose_delete = require("mongoose-delete");

var schema = new Schema({
    name: '',
    logo: '',
    favicon: '',
    tagline: '',
    copyright_text: '',
    email: '',
    cookiesContent: { en: String, fr: String, es: String },
    activeImages: [],
    images: [],
    contact_us: {
        address: '',
        phone: '',
        city: '',
        state: '',
        country: '',
        zip: ''
    },
    shipping: {
        address: '',
        phone: '',
        city: '',
        state: '',
        country: '',
        zip: ''
    },
    isSameAsShippingAddress: { type: Boolean, default: false },
    disableTooltips: { type: Boolean, default: false },
    disableCookiesModal: { type: Boolean, default: false },
    created_at: Date,
    updated_at: Date,
});

schema.plugin(mongoose_delete, { deleted_at: true });

schema.pre("save", function (next) {
    var currentDate = new Date();
    if (!this.created_at) {
        this.created_at = currentDate;
    } else {
        this.updated_at = currentDate;
    }

    next();
});

module.exports = mongoose.model("cms", schema);
