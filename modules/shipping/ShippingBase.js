const easyPost = require('./providers/easyPost');

const AddressService = require('./services/addressService');
const ShipmentsService = require('./services/shipmentsService');
const TrackersService = require('./services/trackersService');

class ShippingBase extends Classes([
    AddressService,
    ShipmentsService,
    TrackersService
]) {

    constructor() {
        super(easyPost);
    }
}

function Classes(bases) {
    class Bases {
        constructor() {
            bases.forEach(base => Object.assign(this, new base(easyPost)));
        }
    }
    bases.forEach(base => {
        Object.getOwnPropertyNames(base.prototype)
            .filter(prop => prop !== 'constructor')
            .forEach(prop => Bases.prototype[prop] = base.prototype[prop])
    });
    return Bases;
}

module.exports = new ShippingBase();