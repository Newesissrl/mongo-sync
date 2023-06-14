# Mongo Sync

## How-to

Run `cp sample.env .env` to generate the neeeded env file
Run `yarn` and then `yarn dev`

## How it works

The script will use the `changeStream` for the specific collection and apply changes to the destination collection.
It currently works on the same cluster only
