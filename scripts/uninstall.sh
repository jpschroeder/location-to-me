#!/bin/bash

echo "Start ssh agent"
eval `ssh-agent`
ssh-add

### Nginx

echo "Remove nginx config"
ssh root@pipeto.me 'rm /etc/nginx/sites-enabled/location-to-me.nginx.conf'
ssh root@pipeto.me 'rm /etc/nginx/sites-available/location-to-me.nginx.conf'

echo "Restart nginx to pick up the changes"
ssh root@pipeto.me 'systemctl restart nginx'

### Service

echo "Stop service"
ssh root@pipeto.me 'systemctl stop location-to-me'

echo "Disable service on boot"
ssh root@pipeto.me 'systemctl disable location-to-me'

echo "Remove service definition"
ssh root@pipeto.me 'rm /lib/systemd/system/location-to-me.service'

### Deployment

ssh root@pipeto.me 'rm -rf /root/data/location-to-me'


echo "Stop ssh agent"
killall ssh-agent
