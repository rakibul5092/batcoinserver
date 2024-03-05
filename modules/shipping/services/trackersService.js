class TrackersService {
    provider;

    constructor (provider){
        this.provider = provider;
    }

    tracker = (id) => this.provider.tracker(id);
    trackers(res){
        this.provider.trackers()
            .then( result => res.send(result))
            .catch(error =>res.status(500).send(error));
    }
}

module.exports = TrackersService;
