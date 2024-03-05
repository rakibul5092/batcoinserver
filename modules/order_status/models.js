var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var schema = new Schema({
    name: String,
    description: String,
    created_by: { type: Schema.Types.ObjectId, ref: 'users' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'users' },
    deleted_by: { type: Schema.Types.ObjectId, ref: 'users' },
    active: Boolean,
    default_status: { type: Boolean, default: false },
    created_at: Date,
    updated_at: Date
});
schema.pre('save', function(next, error) {
    if (this.default_status) {
        OrderStatus.findOne({default_status: true})
            .exec((err, orderStatus) => {
                if (orderStatus) {
                    next(new Error('Default order status already exists.'));
                } else {
                    next();
                }
            });
    } else {
        var currentDate = new Date();
        if (!this.created_at) {
            this.created_at = currentDate;
        } else {
            this.updated_at = currentDate;
        }
        next();
    }
});

var OrderStatus = mongoose.model('order_status', schema)
module.exports = OrderStatus;
