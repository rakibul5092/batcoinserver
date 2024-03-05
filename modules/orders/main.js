var Order=require('./models.js');
var controller=require('./controllers');
var config = require('../../config');
const stripe = require('stripe')(config[process.env.MODE].stripe.secret_key);
const authorize = require('../../middlewares/auth');
const emitModuleChangeEvent = require("../../middlewares/moduleChange");
const {sendOrderEmail} = require("../email/controllers");
const Product = require('../products/models');
const ShippingBase = require('../shipping/ShippingBase');

emitModuleChangeEvent(controller, 'orders');

controller.request(authorize);

controller.post('/stripe-payment', function (req, res) {
    Order.create(req.body.user, async function (err, order) {
        if (err) {
            return res.status(500).send({
                success: false,
                info: "Error",
                error: err
            });
        }

        let shipmentResult;
        try{
            shipmentResult = await ShippingBase.createShipment(
                req.body.shipment.toAddress,
                req.body.shipment.fromAddress,
                req.body.shipment.parcel,
                req.body.shipment.customsInfo,
                req.body.shipment.isReturn || false);
        } catch (e) {
            console.log('creat shipment error');
            console.log(e);
            res.status(500).json({error : {shipping: true, success: false, error:'Error while create shipment'}});
            return;
        }
        if (!shipmentResult || !shipmentResult.success) {
            res.status(500).json(shipmentResult);
        } else{
            stripe.charges.create({
                amount: Math.round(req.body.user.cart.total_price * 100),
                currency: "USD",
                source: req.body.token,
                metadata: {'order_id': String(order._id)}
            }, (err, response) => {
                if (err) {
                    res.status(500).json({error: err});
                    return;
                }

                order.payment_id = response.id;
                order.shipment_id = shipmentResult.shipment.id;

                order.save(function (err, savedOrder) {
                    if (err) {
                        return res.status(500).send({
                            success: false,
                            info: "Database Save Error",
                            error: err
                        });
                    } else {
                        var order = JSON.parse(JSON.stringify(savedOrder));
                        order.message = "New Order Received";
                        order.type = "notification";
                        order.order = savedOrder._id;
                        res.json({
                            success: true,
                            result: {...savedOrder, shipment: shipmentResult.shipment}
                        });
                    }
                });
            });
        }
    });
});


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