import { Model, ModelAttributes, ModelCtor, Sequelize } from "sequelize";
import { hasMethod } from "../helpers/Helpers";
import { IPlugin, Service } from "../ServiceManager";




export type ICreateModel = (name: string, schema: ModelAttributes<Model<any, any>, any>) => ModelCtor<Model<any, any>>

export interface DatabaseModelList {
    [name: string]: ModelCtor<Model<any, any>>
}

export interface Database {
    loadModels(createModel: ICreateModel): void
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
        this.sequelize = new Sequelize({
            dialect: 'sqlite',
            storage: 'db.sqlite'
        });
        for (const plugin of this.plugins) {
            const createModel: ICreateModel = (name: string, schema: ModelAttributes<Model<any, any>, any>) => {
                return this.sequelize!.define(`${plugin.constructor.name}${name}`, schema, {
                    // Other model options go here
                });
            }
            plugin.loadModels(createModel)
        }
    }

    async hook(plugin: IPlugin<Database>) {
        if (hasMethod(plugin.loadModels)) {
            this.plugins.push(plugin)
        }
    }
}