import { hasMethod } from "../helpers/Helpers";
import { Service } from "../ServiceManager";


export interface Database {
    onCommand() : void
}

/**
 * DatabaseService - The database service is used to store the instances of the Sequelize ORM library.
 */
export class DatabaseService extends Service<Database> {
    name = "Database";
    version = "1.0.0";
    priority = 1000; //Load the database service last (assuming we have 1k services)

    static singleton: DatabaseService | null = null;
    static getInstance() {
        if (this.singleton == null) this.singleton = new DatabaseService()
        return this.singleton
    }

    async start() {
        this.log(`Starting ${this.name}`)
    }

    async hook(plugin: Database) {
       
    }
}