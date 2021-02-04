

interface TableOpts {
    syncInterval: Number
}


interface ServerOptions {
    path: string,
    masterKey: String,
    cert?: String,
    secure?: Boolean,
    allowedIps?: Array<String>,
    privateKey?: String
}

interface ClientOptions {
    user: String,
    pass: String,
    secure?: Boolean,
    encryptionKey?: String,
    host?: String,
    port?: String | Number
}

export class Server {
    /**
     * Initialize a Server to manipulate data 
     * @example 
     * let server = new Server({     
     *      path : '/home/urs/db/',
     *      secure : true,
     *      privateKey : 'pathtokey.pem',
     *      cert : 'pathtocert',
     *      allowedIps : ['23.234.123.43' , '127.0.0.1']     
     * })
     */
    constructor(opts: ServerOptions)
}


interface UserCreateOpts {
    user: String,
    pass: String
}


export class Client {
    /**
     * Provide only the key to automatically connect to use the default values
     * @example 
     * let client = new Client({
     *    port:  7777,
     *    host: 'localhost',
     *    user: 'root',
     *    encryptionKey: 'a encryption key that is 32 bytes long' // used to encrypt and decrypt fields across users
     *    pass: 'create a new admin account with a secure password and delete this'
     * })
     */
    constructor(opts: ClientOptions)
    /**
    * Connect to / Create a Database
    * @param name The Name of the Database
    * @example let db = server.db("library")
    */
    db(name: String): Database
    /**
     * Create a new user  [Must be an admin to perform this action]
     * @param opts Options to create a user
     */
    createUser(opts: UserCreateOpts): Promise<0>
    /**
     * Change permissions of a User [Must be an admin to perform this action]
     * @param permissions The permissions that you want to change for that user
     */
    editUser(user: String, permissions: JSON): Promise<0>
    /**
     * Delete a user
     *  [Must be an admin to perform this action]
     * @param user The name of the user you want to delete
     */
    deleteUser(user: String): Promise<0>
    /**
     * Pings the server and returns the time taken for the complete transaction in ms
     */
    ping() : Promise<Number>
}

declare class Database {
    /**
   * Fetch a Table in the Database
   * @param name The Name of the Table
   * @param opts syncInterval - Interval to sync the database to the drive in milliseconds. It's best to keep the syncInterval below 1000 - 1500 ms
   * @example let tb = db.table("books")
   */
    table(name: String, opts: TableOpts): Table
}

declare type Join = JSON;

interface SearchOptions {
    limit?: Number | 'none',
    join?: Join,
}

interface Options {
    limit?: Number | "none"
}

interface genOpts {
    silent?: String,
    label?: String
}

/**
 * Generate a random key with desired length. The key will get displayed
 * @param length Desired Length of the Key
 * @param label Label of the Key
 */
export function genKey(length: Number, opts?: genOpts): String


declare class Table {
    /**
     * Insert a Document 
     * @param doc The Document to be inserted in the Table
     * @example tb.insertDoc({
     *   author : "Robert Brook",
     *   price : 140,
     *   genre : "Thrilling",
     *   name : "The Shadows of the Past"
     * })
     */
    insert(doc: JSON): Promise<0>

    /**
     * Insert a set of Documents in form of an Array
     * @param docArray An Array of Documents to be inserted in the Table
     * @example tb.insertSet([{name : "Mystery" , price : 100} , {name : "The Shadows" , price : 50}])
     */
    insertSet(docArray: Array<JSON>): Promise<0>

    /**
     * Update a set of documents that satisfy a given condition
     * @param condition Condition for updating documents
     * @param update The Update Object
     * @param limit Defaults to 1. Limit the no. of documents updated
     * @example tb.update('name == "Mystery"' , { price : 150 , _inc : ['cost' , 'sno'] }) // _inc -> Increment, _dec -> Decrement
     */
    update(condition: String, update: JSON, opts?: Options): Promise<0>

    /**
     * NOTE : It's not recommended to run this in a live production environment - This should be setup before going live
     * Split the document into smaller fragments ( Shards ) based on the given keys
     * @param keys The Array of Keys ( Properties ) to be used as Shard Keys
     * @example tb.shard(["name", "author"])
     */
    shard(keys: Array<String>): Promise<0>

    /**
     * Select an Array of Documents that match the given condition
     * @param condition The Condition to check with
     * @param opts Options including limit, join, etc..
     * @example let selected = await tb.search('author == "Robert"' , { limit : 5 })
     * @example let selected = await tb.search('price > 50' , { limit : 10 , join : {
     *  authors: 'that.author == this.name as author_info', // Join information from the "authors" table
     *  genre : 'that.genre == this.name' 
     * }})
     * console.log(selected) // -> {name :"Mystery" , price: 150, author: "Robert", genre :"Thrilling", author_info : {name : "Robert" , country : "UK" } , genre : {name : "Thrilling" , keywords : ['suspense', 'thriller', 'mystery'] }}
     */
    search(condition: String, opts?: SearchOptions): Promise<Array<JSON>>

    /**
     * Delete a Set of Documents based on a given condition. The Limit defaults to 1. Specify the limit as "none" to delete all documents that satisfy the condition
     * @param condition The Condition which is tested to delete documents
     * @param opts Options like limit
     * @example tb.delete('price < 50 && prem == false' , { limit : 3 })
     */
    delete(condition: String, opts?: Options): Promise<0>

    /**
     * NOTE : It's not recommended to run this in a live production environment - This should be setup before going live
     * Merges all shards into a single document reversing the Sharding Process
     */
    unshard(): 0
}
