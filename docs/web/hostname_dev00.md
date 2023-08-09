To test app on different hostname add this to `/etc/hosts`

    127.0.0.1 dev00.fogbender-test.com

then run web with these options:

    PUBLIC_API_SERVER_URL=http://dev00.fogbender-test.com:8000 yarn start

and open http://dev00.fogbender-test.com:3100/admin
