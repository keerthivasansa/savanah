![HareLogo](https://content-na.drive.amazonaws.com/v2/download/presigned/2OL6S8sboReZgHnzKToaMyvvlKYqApKLoWmKj5spKuopX92IB)

# Savanah
SavanahDB is a futuristic Database Management Software built entirely on NodeJS. From realSync to ms search of millions of documents, it's a complete collection of mind-blowing digital 1s and 0s. Be Part of the Future

---

Latest Version : **Hare Edition ( 0.1.a )**

Production-ready : False. This version is intended to be a showcase of the core concepts of SavanahDB. A more secure, feature-packed version is coming in the Saber Edition which will be aimed for production environment. 

**Support me** : SavanahDB is developed by one student, to support me and my other projects please consider becoming my Patron here : https://www.patreon.com/savanah . Ofcourse, this project is free-to-use and always will be.

License: SEE LICENSE IN LICENSE.md

Copyright (c) Keerthi Vasan

---

## What's realSync? 
realSync is the technology we use to instantaneously show changes in your Database be it in search queries, other updates, etc.. If you tell the database to update 1 Million Records if it's price is $56, the name should be "Sushi", and that line of code is followed by the deletion of all documents with the name "Sushi", the database will delete all documents with price as $56, based on your last condition even if it's only 0.01 ms since the last command as you would expect it to. The Database is **always up-to-date**, and all your commands are executed on the updated version no matter the interval between the commands

## NoSQL or SQL?
Gone are the days where you have to trade off flexibility and scaling for relations and joins. SavanahDB is NoSQL by definition, but it can also be used to join records from other tables, establish relationships and easily construct complex relational conditions like :
`( price >= 50 || customer == "John" && ( city == "New York" || country == "France" ) )`
and get an Array of JSON but also having some new Features like Shards, realSync, etc..

### Upcoming Features in `Saber Edition` : 
 - Extended Type Support : Store Maps, Sets, Dates and more Types as is in the Database
 - The Server will be written in Go?
 - More Secure, reliable Package
 - Opening new Threads on-demand to manage traffic and load [Vertical Scaling]
 - Connect Multiple Servers and creating a "Mainframe" which divides the load across multiple devices without sacrificing consistency [Horizontal Scaling]
 - Encrypted Export and Import 
 - Tree Encryption 
 - User Access Management : Allow / deny user access to specific tables, specific commands on tables, etc..

# Documentation :
 
For : Hare Edition

## Setting up :

```javascript
  import { Server } from "savanahdb"
  
  let server = new Server('/home/usr/db/') // The Path to the Collection of the Databases
  
  let db = server.db("library")
  let tb = db.table("books")
  
```
That's it for creating a Database and a Table . It will create a new one if it doesn't exist in the path, or just connect to the existing one. The same goes for the table

## Inserting Documents

Inserting Documents into the Database is pretty easy too. Following the above Code from Setting up,

```javascript
tb.insert({
    author : "Robert",
    name : "Shadows of the Future",
    price : 100
})  
```
It takes any valid JSON and inserts into the Table. Most funcitons in Savanah are asynchronous in nature, and so is non-blocking
But if you have to insert multiple Documents at once, using insertSet() is much more efficient

```javascript
tb.insert([{
    author : "Robert",
    name : "Shadows of the Future",
    price : 100
  },{
    author : 'Claire',
    name : "The Cave",
    price: 45
}])  
```

## Updating Documents

Based on a given condition, you can update documents in a Table. It takes the condition / filter as the First argument, an Update Object as the second argument and OptionsObject as the third

```javascript
tb.update('price >=50' , {
    _dec : ['price'],
    priceislow : true
})
```
---

**Operators** : Valid Operators that can be used in a Filter / Condition : `<,<=,>,>=,==,===,!=`

---

### The Update Object
Update Object is the Object that contains properties to be updated. For eg: To set "author" as "Robert", Update Object should be as follows: { author : "Robert" }
But it also takes few special properties like the `_inc` and `_dec`. The `_inc` increments a Property and `_dec` decrements a Property.
Example : 
```javascript
tb.update('price > 50' , {
    _dec : ['price','cost'],
    _inc : ['demand','rep']
} , { limit : 5 })
```
Above code increments the properties "demand" and "rep" and decrements the properties "price" and "cost" where the price is greated than 50 till 5 Documents are updated 

---

**Options** : { **limit** : Takes a Number indicating the no. of Documents to be Updated, Pass "none" to make SavanahDB update all documents matching the condition. If nothing is passed, limit is taken as 1. }

---

## Deleting Documents

Pass a condition and optionally an OptionsObject with limit to delete documents
```javascript
tb.delete('author == "Robert"' , { limit : 5 })
```
Few more Examples : 
```javascript
tb.delete('price > 50' , { limit : 'none' }) // Delete all documents with price greater than 50

tb.delete('name == "Sushi") // Deletes the First Document with name as "Sushi"
```

## Search

Generally the most used part of a Database Software, Search comes with a lot of features baked in. 
First, a simple search :
```javascript
tb.search('price < 50') // Returns the First Document with price below 50
```
To explaing "join", let's create a simple relationship where you store "Posts" a "User" posts. The Initial Setup:
```javascript
let server = new Server('/home/usr/db/')
let db = server.db('network')
let users = db.table('users')
let posts = db.table('posts')  
```
First, you store the User Document when they sign up: 
```javascript
users.insert({
    name : 'John Adam',
    city : 'New York',
    tier : 'Silver',
    prem : true,
    id : 'usrOw9a0eif0923aewf'
})
```
Next you store two Posts they posted in referance to their `id` essentially establishing a relationship between the tables:
```javascript
posts.insert({
    usr : 'usrOw9a0eif0923aewf',
    content : 'I love this network.'
})
// A Few Moments Later..
posts.insert({
    usr : 'usrOw9a0eif0923aewf',
    content : "Nvm, I don't know anymore"
})
```
Now when someone visits the Orginal User's Profile to list the posts they have posted, you create a search like this : 
```javascript
let usr = await users.search('id == ""', {
    join : {
      posts : 'that.usr == this.id' 
    }
}
```
In this case the `usr` Document will be : 
```javascript
[{
   name : 'John Adam',
    city : 'New York',
    tier : 'Silver',
    prem : true,
    id : 'usrOw9a0eif0923aewf',
    posts : [{
    usr : 'usrOw9a0eif0923aewf',
    content : 'I love this network.'
  },{
    usr : 'usrOw9a0eif0923aewf',
    content : "Nvm, I don't know anymore"
  }]
}] // => Note that a Search always returns an Array even if limit is 1
```

## Sharding

## What's a Shard? And how to determine the Keys to use as Shard Keys
Sharding takes properties of Document as argument and splits the entire table into smaller pieces called Shards. This significantly increases the performance across the board except increases the time taken to insert documents ( It only takes a few ms, but still slower than normal ). The more properties you have to shard, the better the performance
Cool, you may ask "Why shouldn't I shard with every property I use ?" The explanation is if you don't specify the shards example : `price` in the filter, it will take a longer time because now it has to scan through all the pieces. The Best Properties to shard are the ones you most often use in your filter. Think of your use case, how you would form a filter during update, search and delete. Are there any common properties you always use? Then use them as your shard keys. For example: You are a bank and you store the location of the customer. Now everytime you query you include the "Branch" and "Country" to get the exact customer. Then it's best to shard the entire table based on "Branch" and "Country". This significantly increases performance without changing filter at all.

## How to Shard?
Once you decide on the shard keys, it's time to actually do the sharding. To shard use :

```javascript
tb.shard([keys])
```
It's best to do it before going live, but it won't affect your Documents whatsoever.
Sharding for the Bank Example : 
```javascript
tb.shard(['country','branch'])
```
If you think you need to reverse and merge all shards together again, you can use unshard():
```javascript
tb.unshard()
```
This automatically merges all existing shards into one file again.
It's best to mess around a little bit, and think about your use case for deciding the Shard Keys. Obviously you can use SavanahDB and not shard your Table, but if you want to scale and increase your Performance, this is a great way to go.