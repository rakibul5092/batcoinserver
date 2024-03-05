module.exports = class AddressService {
    provider;

    constructor(provider){
        this.provider = provider;
    }

    getAddress = (id) => this.provider.getAddress(id);

    createAddress = (data) => this.provider.createAddress(data);

    getAllAddresses = () => this.provider.getAllAddresses();
}