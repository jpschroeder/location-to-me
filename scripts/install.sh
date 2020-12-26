#!/bin/bash

echo "Start ssh agent"
eval `ssh-agent`
ssh-add

## Building

echo "Building"
go build -ldflags="-s -w"

## Deployment

echo "Create destination folder"
ssh root@pipeto.me 'mkdir /root/data/location-to-me'

echo "Copying files"
scp ./location-to-me root@pipeto.me:/root/data/location-to-me/location-to-me
scp -r ./public root@pipeto.me:/root/data/location-to-me

echo "Set file permissions"
ssh root@pipeto.me 'chmod +x /root/data/location-to-me/location-to-me'
ssh root@pipeto.me 'find /root/data/location-to-me/public -type d -exec chmod 755 {} +'
ssh root@pipeto.me 'find /root/data/location-to-me/public -type f -exec chmod 644 {} +'

### Service

echo "Copy service definition"
scp ./scripts/location-to-me.service root@pipeto.me:/lib/systemd/system/location-to-me.service
ssh root@pipeto.me 'systemctl daemon-reload'

echo "Start service"
ssh root@pipeto.me 'systemctl start location-to-me'

echo "Enable service on boot"
ssh root@pipeto.me 'systemctl enable location-to-me'

echo "Check service status"
ssh root@pipeto.me 'systemctl status location-to-me'

### Nginx

# echo "Make sure that nginx is installed"
# ssh root@pipeto.me 'apt-get install -y nginx'

echo "Copy nginx config"
scp ./scripts/location-to-me.nginx.conf root@pipeto.me:/etc/nginx/sites-available/location-to-me.nginx.conf

echo "Enable the nginx"
ssh root@pipeto.me 'ln -s /etc/nginx/sites-available/location-to-me.nginx.conf /etc/nginx/sites-enabled/location-to-me.nginx.conf'

echo "Restart nginx to pick up the changes"
ssh root@pipeto.me 'systemctl restart nginx'

### Nginx Https

# echo "Install letsencrypt client"
# ssh root@pipeto.me 'add-apt-repository ppa:certbot/certbot'
# ssh root@pipeto.me 'apt-get install python-certbot-nginx'

echo "Generate and install certificate"
ssh root@pipeto.me 'certbot --nginx -d places.pipeto.me'


echo "Stop ssh agent"
killall ssh-agent
