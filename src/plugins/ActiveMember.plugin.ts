/**
 * ActiveMember - Active member tracker, meaning when a user
 * messages a lot (in the case enough per day) then become an active member. 
 * The activeness doesn't expire for a time and based on the total amount of active 
 * members the total required will need to be increase. 
 * 
 * 
 * 
 * @author Brendan Fuller
 * @version 1.0.0
 * @copyright 2022
 * @license MIT
 */

import { Plugin } from "../PluginManager";
import { Discord } from "../services/DiscordService";
import { Web, WebRoute } from "../services/WebService";

export class ActiveMember extends Plugin implements Discord,Web {
    name = "Active Member";
    version = "1.0.0"

    onCommand() {
        this.log("on command!")
    }
    onInteraction() {

    }
    setupWebRoutes(get: WebRoute,post: WebRoute) {
        get("", (render,query,body) => {
            render("home")
            console.log(query)
        })
    }
}