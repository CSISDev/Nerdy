/**
 * Nerdy - A multi-purpose discord bot for unqiue guild mangement and features. 
 * 
 * @author Brendan Fuller
 * @version 1.0.0
 * @copyright 2022
 * @license MIT
 */

//Import logger library and setup logging
import { setOutput, outputs, setNamespaces, setLevel, createLogger } from "@ekino/logger";

setOutput(outputs.pretty)
setLevel('info')
const logger = createLogger("Nerdy")


//Import dotenv for enviroment variables in `.env` file
import dotenv from 'dotenv'
dotenv.config()

//Impor the managers for the base projects and create an instance of them
import { PluginManager } from "./PluginManager";
import { ServiceManager, } from "./ServiceManager";

const pluginManager = new PluginManager;
const serviceManager = new ServiceManager;

//Provide the logging namespace for them
serviceManager.setLoggerNamespace("Nerdy:ServiceManager")
pluginManager.setLoggerNamespace("Nerdy:PluginManager")

//Import all of the Services
import { DiscordService } from "./services/DiscordService";
import { WebService } from "./services/WebService";
import { DatabaseService } from "./services/DatabaseService";

//Add all of the services to the manager
serviceManager.add(DiscordService.getInstance())
serviceManager.add(WebService.getInstance());
serviceManager.add(DatabaseService.getInstance());

//Import the plugins
import { ActiveMember } from "./plugins/ActiveMember.plugin";
import { ClassCourseManager } from "./plugins/ClassCourseManager.plugin";

//Now add the plugins to the plugin manager
pluginManager.add(new ActiveMember());
pluginManager.add(new ClassCourseManager())

//Hook the service manager into the plugins (and call hooks aka a pre load)
pluginManager.hookIntoServiceManager(serviceManager)

//Start the services (which starts the framework)!
serviceManager.start()