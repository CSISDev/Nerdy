import { createLogger, Logger } from "@ekino/logger";
import { extname } from "path";
import { ServiceManager } from "./ServiceManager";




/**
 * Plugin - A module that interface with services
 **/
export abstract class Plugin {
    abstract name: string;
    abstract version: string;
    
    constructor() {
        this.logger = createLogger("*:Plugins:" + this.constructor.name)
    }

    /**
     * Log - Logging with information
     * @param message Message to be logged
     */
    logger: Logger;
    log(message: string) {
        this.logger.info(message)
    }
    setLogger(logger: Logger) {
        this.logger = logger
    }
}

export class PluginManager {

    //Make a singleton for the PluginManager
    static singleton: PluginManager | null = null;
    static getInstance() {
        //Do we have an instance of said PluginManager?
        if (this.singleton == null) {
            this.singleton = new PluginManager()
        }
        //Return said PluginManager
        return this.singleton
    }

    loggerNamespace: string = "*:services";
    setLoggerNamespace(namespace: string) {
        this.loggerNamespace = namespace
    }


    //Create a new map of plugins
    plugins: Map<String, Plugin> = new Map()


    add(plugin: Plugin) {
        plugin.setLogger(createLogger(`${this.loggerNamespace}:${plugin.constructor.name}`))
        this.plugins.set(plugin.constructor.name, plugin)
    }

    /**
     * hookIntoServiceManager - Hooks the plugins into the service manager by providing the plugin into said manager for each service
     * @param serviceManager 
     */
    hookIntoServiceManager(serviceManager: ServiceManager) {
        this.plugins.forEach((plugin) => {
            serviceManager.services.forEach((service) => {
                service.hook(plugin)
            })
        })
    }
}