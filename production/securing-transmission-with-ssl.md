# Securing Transmission with SSL

For production environment, you **should** encrypt all traffic with a SSL Certificate.

First, if you don't have one you can get one for free from [Let's encrypt](https://letsencrypt.org/)

You will need a SSL Certificate and a Private Key to ensure secure transmission. In your \`server.js\`, include some extra parameters

```javascript
import { Server } from "server.js"

let server = new Server({
    path : "/var/db/",
    cert : "path_to_cert.crt",
    privateKey : "path_to_key.pem",
    masterKey : process.env.MASTER_KEY
})
```

And when connecting through any client, make sure you pass the **secure** parameter as true to use the Secure Protocol in the Client

```javascript
import { Client } from "server.js"

const client = new Client({
    user : "root",
    pass : "create a new admin account with a secure password and delete this",
    secure : true
})
```

