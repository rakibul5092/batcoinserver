const express = require('express');
const router = express.Router();
const app = require('express')();
const authorize = require('../../../middlewares/auth');
const ShippingBase = require('../ShippingBase');

// router.use(authorize);
router.get('/:id' , (req, res) => {
    if (req.params.id) {
        ShippingBase.getAddress(req.params.id)
            .then(result => res.send(result))
            .catch(error => res.status(500).send(error));
    } else {
        res.status(404).send("Address ID IS REQUIRED")
    }
});

router.get('/' , (req, res) => {
    ShippingBase.getAllAddresses()
            .then(result => res.send(result))
            .catch(error => res.status(500).send(error));
});

router.post('/' , async (req, res) => {
   const result = await ShippingBase.createAddress(req.body);
    res.send(result);
});


module.exports=router;