const express = require('express');
const router = express.Router();
const app = require('express')();
const authorize = require('../../../middlewares/auth');
const ShippingBase = require('../ShippingBase');

router.use(authorize);

router.get('/:id' , (req, res) => {
    if (req.params.id) {
        ShippingBase.tracker(req.params.id)
            .then(result => res.send(result))
            .catch(error => res.status(500).send(error));
    } else {
        res.status(404).send("TRACKER ID IS REQUIRED")
    }
});


module.exports=router;