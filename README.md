# Welcome to the MONGO Sync Project!

<!-- Mission Statement -->
<!-- More information about crafting your mission statement with examples -->
<!-- https://contribute.cncf.io/maintainers/governance/charter/ -->

MONGO Sync is a utility service that allows to run continous synchronisation of a MongoDB Collecton to a separate collection in the same or an external MongoDB replica set.

Possible use cases: 
* Create an historical and complete archive of the content entering into an active collection that is kept constantly small with short TTL
* Create a near-real-time copy of a specific collection on a secondary MongoDB instance (to be further developed: It currently works on the same cluster only)

The solution has been designed to take advantage of the `changeStream` for the specific collection and apply changes to the destination collection


## Getting Started

Run `cp sample.env .env` to generate the neeeded env file
Run `yarn` and then `yarn dev`

## Contributing

Our project welcomes contributions from any member of our community. To get
started contributing, please see our [Contributor Guide](CONTRIBUTING.md).

## Scope


### In Scope

MONGO Sync is intended to synchronise in near-real-time individual collections. As such, the
project will implement or has implemented:

* Connection to `changeStream` for the specific collection
* Definition of destination rules (fixed collection name or rotation based on time)
* Destination in same or different MongoDB instance


### Out of Scope

MONGO Sync will be used in a cloud native environment with other
tools. The following specific functionality will therefore not be incorporated:

* Complete data Migration between MongoDB instances
* Data synchronisation targeting file system or other databases


## License

This project is licensed under the [Apache license](LICENSE)

## Conduct

We follow the [CNCF Code of Conduct](CODE_OF_CONDUCT.md).
