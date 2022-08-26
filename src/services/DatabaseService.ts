import { Model, ModelAttributes, ModelCtor, Sequelize } from "sequelize";
import { hasMethod } from "../helpers/Helpers";
import { IPlugin, Service } from "../ServiceManager";
import mariadb from "mariadb"



export type ICreateModel = (name: string, schema: ModelAttributes<Model<any, any>, any>) => ModelCtor<Model<any, any>>

export interface DatabaseModelList {
    [name: string]: ModelCtor<Model<any, any>>
}

export interface Database {
    createModel(createModel: ICreateModel): void
    models: DatabaseModelList | null
}

/**
 * DatabaseService - The database service is used to store the instances of the Sequelize ORM library.
 */
export class DatabaseService extends Service<Database> {
    name = "Database";
    version = "1.0.0";
    priority = -1; //Load the database service first.

    sequelize: Sequelize | null = null

    static singleton: DatabaseService | null = null;
    static getInstance() {
        if (this.singleton == null) this.singleton = new DatabaseService()
        return this.singleton
    }


    plugins: IPlugin<Database>[] = []

    async start() {
        this.log(`Starting ${this.name}`)

        //Create the database if a mariadb database is used (recommeneded)
        if (process.env.DATABASE_URI != null && process.env.DATABASE_URI.includes("mariadb://")) {
            const pool = mariadb.createPool({host: process.env.DATABASE_HOST, user: process.env.DATABASE_USER, connectionLimit: 5});

            let conn;
            try {
                conn = await pool.getConnection();
                await conn.query("CREATE DATABASE IF NOT EXISTS bot");
            } finally {
                if (conn) await conn.release(); //release to pool
                
            }
            await pool.end()
        }
        
        if(process.env.DATABASE_URI) {
            console.log({uri: process.env.DATABASE_URI})
            this.sequelize = new Sequelize(process.env.DATABASE_URI);
        } else {
            this.sequelize = new Sequelize({
                dialect: "sqlite",
                database: "db.sqlite"
            });
        }
        
        for (const plugin of this.plugins) {
            const createModel: ICreateModel = (name: string, schema: ModelAttributes<Model<any, any>, any>) => {
                return this.sequelize!.define(`${plugin.constructor.name}_${name}`, schema, {
                    // Other model options go here
                });
            }
            plugin.createModel(createModel)
        }
    }

    async hook(plugin: IPlugin<Database>) {
        if (hasMethod(plugin.createModel)) {
            this.plugins.push(plugin)
        }
    }
}