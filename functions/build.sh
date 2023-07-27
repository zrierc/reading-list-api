#!/bin/bash
rm -rf ./dist
tsc
rm functions.zip
cp package.json dist/package.json
cp -R node_modules dist/node_modules
cd ./dist/ || exit
zip -r ../functions.zip ./*
cd ..