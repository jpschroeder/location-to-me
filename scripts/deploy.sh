#!/bin/bash

echo "Start ssh agent"
eval `ssh-agent`
ssh-add

echo "Building"
go build -ldflags="-s -w"

echo "Stop service"
ssh root@pipeto.me 'systemctl stop location-to-me'

echo "Copying files"
scp ./location-to-me root@pipeto.me:/root/data/location-to-me/location-to-me
scp -r ./public root@pipeto.me:/root/data/location-to-me

echo "Set file permissions"
ssh root@pipeto.me 'chmod +x /root/data/location-to-me/location-to-me'
ssh root@pipeto.me 'find /root/data/location-to-me/public -type d -exec chmod 755 {} +'
ssh root@pipeto.me 'find /root/data/location-to-me/public -type f -exec chmod 644 {} +'

echo "Start service"
ssh root@pipeto.me 'systemctl start location-to-me'

echo "Stop ssh agent"
killall ssh-agent
