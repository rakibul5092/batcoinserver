var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongoose_delete = require('mongoose-delete');
var mongoose_autopopulate = require('mongoose-autopopulate');
var OrderStatus=require('../order_status/models');

var schema = new Schema({
    first_name: String,
    last_name: String,
    company_name: String,
    country: String,
    address_line_1: String,
    address_line_2: String,
    town: String,
    state: String,
    postal_code: String,
    email: { type: String },
    phone: { type: String },
    cart: {
        items: [
            {
                product: {
                    type: Schema.Types.ObjectId,
                    ref: 'products',
                    required: true
                },
                quantity: { type: Number, default: 0}
            }
        ],
        total_price: {type: Number, default: 0} 
    },
    order_status: { type:Schema.Types.ObjectId, ref:'order_status', autopopulate: true },
    isDeleted: {type:Boolean, default: false},
    payment_id: String,
    shipment_id: String,
    created_at: Date,
    updated_at: Date
});

schema.plugin(mongoose_autopopulate);
schema.plugin(mongoose_delete, { deleted_at : true });


schema.pre('save', function(next) {
    var currentDate = new Date();
    if (!this.created_at) {
        this.created_at = currentDate;
    } else {
        this.updated_at = currentDate;
    }

    OrderStatus.findOne({default_status: true})
        .exec(function(err, orderStatus) {
            if (orderStatus) {
                this.order_status = orderStatus;
            }
            next();
        });
});

schema.pre('remove', function(next) {
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

module.exports = mongoose.model('orders', schema);