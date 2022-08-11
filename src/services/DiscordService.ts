import { hasMethod } from "../helpers/Helpers";
import { Service } from "../ServiceManager";

import { Client } from "discord.js";



export interface Discord {
    onCommand() : void
}

export class DiscordService extends Service<Discord> {
    name = "Discord";
    version = "1.0.0";
    priority = 0;

    client?: Client

    static singleton: DiscordService | null = null;
    static getInstance() {
        if (this.singleton == null) this.singleton = new DiscordService()
        return this.singleton
    }

    async start() {
        this.log(`Starting ${this.name}`)
        this.client = new Client({
            intents: []
        });
        //this.client.login(process.env.BOT_TOKEN)
        this.client.on("ready", () => {
            const client = this.client!
            this.log(`Logged in as ${client.user!.tag}!`)
        })
    }

    async hook(plugin: Discord) {
        
    }
}