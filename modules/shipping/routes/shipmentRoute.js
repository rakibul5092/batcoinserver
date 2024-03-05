const express = require('express');
const router = express.Router();
const async = require('async');
const app = require('express')();
const authorize = require('../../../middlewares/auth');
const ShippingBase = require('../ShippingBase');
const Product = require('../../products/models');
const Order = require('../../orders/models');
const {sendOrderEmail} = require("../../email/controllers");

// router.use(authorize);


router.get('/:id' , async (req, res) => {
    if (req.params.id) {
        ShippingBase.getShipment(req.params.id)
            .then(result => res.send(result))
            .catch(error => res.status(500).send(error));
    } else {
        res.status(404).send("SHIPMENT ID IS REQUIRED")
    }
});

router.get('/' , async (req, res) => {
    ShippingBase.getShipments()
            .then(result => res.send(result))
            .catch(error => res.status(500).send(error));
});

router.post('/' , async (req, res) => {
    ShippingBase.createShipment(
        req.body.toAddress,
        req.body.fromAddress,
        req.body.parcel,
        req.body.customsInfo,
        req.body.isReturn)
        .then(result => res.send(result))
        .catch(error => res.status(500).send(error));
});


router.post('/buy' , async (req, res) => {
    if (req.body.shipmentId && req.body.rateId && req.body.amount && req.body.orderId) {
        let savedOrder = await Order.findById(req.body.orderId);

        ShippingBase.buyShipment(req.body.shipmentId, req.body.rateId, req.body.amount)
            .then(shipment =>{
                ShippingBase.tracker(shipment.tracker.id).then(tracker =>{
                    var order = JSON.parse(JSON.stringify(savedOrder));
                    order.message = "New Order Received";
                    order.type = "notification";
                    order.order = savedOrder._id;
                    sendEmail(order, savedOrder, req.body.amount, tracker, function () {
                        process.emit("notification", order);
                        res.send({shipment, tracker});
                    });
                }).catch(error =>
                    res.status(500).send(error)
                );
            })
            .catch(error =>
                res.status(500).send(error)
            );
    } else {
        res.status(404).send("SHIPMENT ID, Rate ID AND AMOUNT IS REQUIRED")
    }
});


router.post('/refund/:id' , async (req, res) => {
    if (req.params.id) {
        ShippingBase.refundShipment(req.params.id)
            .then(result => res.send(result))
            .catch(error => res.status(500).send(error));
    } else {
        res.status(404).send("SHIPMENT ID IS REQUIRED")
    }
});




function sendEmail(order, savedOrder, shipmentRate, tracker, callback) {
    let selectedProducts = [];
    Promise.all(
        order.cart.items.map(async (item) => {
            let product = await Product.findById(item.product);
            selectedProducts.push({product, quantity: item.quantity});
        })
    ).then(async() => {
        const tax = 0; // will be calculated later on
        const subtotal = order.cart.total_price;
        const total = subtotal + tax;
        sendOrderEmail(order.email, savedOrder._id, total, selectedProducts, order.first_name, tax, subtotal, shipmentRate, tracker);
        callback();
    });
}


module.exports=router;