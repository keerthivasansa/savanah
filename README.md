![Edition](https://img.shields.io/badge/Edition-Saber-orange)
![Release](https://img.shields.io/badge/Release-1-or)
![Version](https://img.shields.io/badge/Version-1.0.1-red)
![Activity](https://img.shields.io/badge/Supported-Yes-blueviolet)

![Logo](https://thumbnails-photos.amazon.com/v1/thumbnail/C2yTitUIRBaD0CQj7YfquA?viewBox=2732%2C683&ownerId=A3VO5VGPW45J4C&groupShareToken=EATagQLXSwygHtzfVpFQWg.eZFEnJJ3az55bQOsuC80Gh)

# SavanahDB

A Full-blown Professional Database Management Software written completely in Javascript


## Support and Contribution

The Official Discord Server where you can get support for this package from the developer: [Invite](https://discord.com/invite/GBmMQd2xtB)

This package is developed, maintained and updated with a single person. If you would like to financially support the creator and thereby this package consider becoming a patron : [Patreon](https://www.patreon.com/savanah)
## Basic Documentation

### Setting up a Server

Write the below code in a file

`server.js` 
```javascript
import { Server } from 'savanahdb'

let server = new Server({
    path : "/var/data/",
    masterKey : process.env.MASTER_KEY   
})
```

By default it listens in `http://localhost:7777` but it can be changed by passing `host,port` in the Server options

Run it with [pm2](https://npmjs.com/package/pm2)

### Connecting to the Server
```javascript
import { Client } from 'savanahdb'

let client = new Client({
    user : "root",
    pass : "create a new admin account with a secure password and delete this"   
})

let db = client.db("demo")

let tb = db.table("no")
```
The above credentials are the Default ones, please do remember to create a new user and delete the `root` user

### Insert
Inserting data into a table is easy, structure the data into JSON Format and pass it to insert() function of a Table

```javascript
tb.insert({
   author : "Robert",
   price : 120,
   premium : true
})
```

or to insert a set of documents : 

```javascript
tb.insertSet([{
   author : "Robert",
   price : 120,
   premium : true
},{
   author : "John",
   price : 40,
   premium : false
}])
```

### Search

Valid Operators : `!=, ==, ===, >, <, >=, <=`

Get an array of documents that match a given condition

```javascript
tb.search('name == "John"') // gets all documents with name as John

tb.search('( name == "John" && price > 100 ) || premium === true') 
// you can group conditions to get better suited results

tb.search('name != "John"' , {
  join : {
       authors : 'that.name == this.author as author_info'
  },
  limit : 5
})
//joins documents from other tables. Here "authors" is the table from 
// which the data is going to be joined
// and limits the result to a maximum of 5 Documents
```

### Update
Update existing data with a condition and limit
```javascript
tb.update('author == "John"' , {
  premium : false,
  _inc : ['rep', 'price'] // increment properties
} , { limit : 2 }) 
```
Limits defaults to 1, pass "none" as limit to update all records that satisfy the condition

### Delete

```javascript
tb.delete('premium === false')
```

Limits defaults to 1, pass "none" as limit to delete all records that satisfy the condition



----

Copyright (c) 2021 Keerthi Vasan <mrsheepwithglasses@gmail.com>

**Patreon** : [here](https://www.patreon.com/savanah)

**Discord Server** : [Invite](https://discord.com/invite/GBmMQd2xtB)

-----

## License

[Click here](https://github.com/Nectres/savanah/blob/master/LICENSE.md) to read the License