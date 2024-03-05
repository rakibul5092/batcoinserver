const EasyPost = require('@easypost/api');
const config = require('../../../config');
const api = new EasyPost( config[process.env.MODE].EasyPostApiKey );

module.exports = {

    // ------------------ addresses services --------------
    getAddress: (id) => api.Address.retrieve(id),

    createAddress: (data) => {
        const address = new api.Address(data);
        return address.save();
    },
    getAllAddresses: () => api.Address.all(),


    // ------------------ shipment services --------------
    createShipment: async (toAddress, fromAddress, parcel, customsInfo, isReturn) => {

        fromAddress.verify = ["delivery"];
        const address = new api.Address(fromAddress);
        const fromAddressData = await address.save();
        if(!fromAddressData.verifications.delivery.success){
            return {success: false, error: 'Not Valid Store Address', notValidStoreAddress: true };
        }

        // toAddress.verify = ["delivery"];
        const address2 = new api.Address(toAddress);
        const toAddressData = await address2.save();
        if(toAddressData.verifications && toAddressData.verifications.delivery &&
            !toAddressData.verifications.delivery.success){
            console.log('-----------------  Shipping To Address verifications error : ------------');
            console.log(JSON.stringify(toAddressData.verifications.delivery.errors));
            return {success: false, error: 'Not Valid Address', notValidAddress: true };
        }



        const shipment = new api.Shipment({
            to_address: new api.Address(toAddressData),
            from_address: new api.Address(fromAddressData),
            parcel:  new api.Parcel(parcel),
            customs_info: new api.CustomsInfo(customsInfo),
            is_return: isReturn || false
        });

        const shipmentData = await shipment.save();

        return {success: true, shipment: shipmentData};
    },
    getShipment: (id) => api.Shipment.retrieve(id),
    getShipments: () => api.Shipment.all(),
    buyShipment: async (shipmentId, rateId, amount) => {
        const Shipment = await api.Shipment.retrieve(shipmentId);
        return Shipment.buy(rateId, amount);
    },
    refundShipment: async (id) => {
        const Shipment = await api.Shipment.retrieve(id);
        return Shipment.refund();
    },


    // ------------------ tracker services --------------
    tracker: (id) => api.Tracker.retrieve(id),
    trackers: () => {}
};
