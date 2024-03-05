class ShipmentsService {
    provider;

    constructor (provider){
        this.provider = provider;
    }

    shipment(res, id){
        this.provider.shipment(id)
            .then( result => res.send(result))
            .catch(error =>res.status(500).send(error));
    }

    createShipment = (toAddress, fromAddress, parcel, customsInfo, isReturn) =>
         this.provider.createShipment(toAddress, fromAddress, parcel, customsInfo, isReturn);

    getShipment = (id)=> this.provider.getShipment(id);

    getShipments = () => this.provider.getShipments();

    buyShipment = (shipmentId, rateId, amount) => this.provider.buyShipment(shipmentId, rateId, amount);

    refundShipment = (id) => this.provider.refundShipment(id);
}

module.exports = ShipmentsService;
