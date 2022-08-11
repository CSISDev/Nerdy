import { createLogger, Logger } from "@ekino/logger";
import { Plugin } from "./PluginManager";



export interface ServiceHandler<T,Z> {
    service: T,
    handler: Z
}


/**
 * Service - A component of the main bot which provides a generic T
 * that is the interface for the Plugin implementation.
 */
export abstract class Service<T> {
    abstract name: string;
    abstract version: string;
    abstract priority: number;

    abstract hook(plugin: T): void
    abstract start(): void

    constructor() {
        this.logger = createLogger("*:Services:" + this.constructor.name)
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



export class ServiceManager {
    //Create a list of services
    services: Map<String, Service<any>> = new Map()

    loggerNamespace: string = "*:Services";
    setLoggerNamespace(namespace: string) {
        this.loggerNamespace = namespace
    }

    add(service: Service<any>) {
        service.setLogger(createLogger(`${this.loggerNamespace}:${service.constructor.name}`))
        this.services.set(service.constructor.name, service)     
    }

    start() {
        const sortedServices = Array.from(this.services.values()).sort((a,b) => {
            return a.priority < b.priority ? -1 : (a.priority > b.priority ? 1 : 0);
        })
        //Start services based on the sort (assuming lower is starting first)
        sortedServices.map((value) => {
            value.start()
        })
    }
}