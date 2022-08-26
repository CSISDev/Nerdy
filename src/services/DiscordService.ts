import { hasMethod } from "../helpers/Helpers";
import { IPlugin, Service } from "../ServiceManager";

import { CacheType, ChatInputCommandInteraction, Client, IntentsBitField, Interaction, Routes, SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from "discord.js";
import { REST } from "discord.js";
import { Plugin } from "../PluginManager";


interface ICommandHolder<T> {
    [command: string]: IPlugin<T>
}

interface ICommandState {
    [command: string]: boolean
}

interface IPlugins<T> {
    [plugin: string]: T
}

export type SlashCommand = SlashCommandSubcommandsOnlyBuilder | SlashCommandBuilder

export interface Discord {
    onCommand(name: string, interaction: ChatInputCommandInteraction<CacheType>) : void,
    createCommandInteraction(): SlashCommand[]
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


    plugins: IPlugin<Discord>[] = [];
    commandStates: IPlugins<ICommandState> = {}
    commandHolder: ICommandHolder<Discord> = {}


    async start() {
        this.log(`Starting ${this.name}`)
        this.client = new Client({
            intents: [IntentsBitField.Flags.GuildMembers, IntentsBitField.Flags.Guilds]
        });

        //Discord ready event, fired once bot is logged in
        this.client.on("ready", () => {
            const client = this.client!
            this.log(`Logged in as ${client.user!.tag}!`)
            
            const CLIENT_ID = client.user!.id;
        
            const rest = new REST({
                version: '9'
            }).setToken(process.env.BOT_TOKEN!);

            //Now create the commands!
            this.createCommandInteraction(rest)
        })

        this.client.on('interactionCreate', async interaction => {
            if (!interaction.isChatInputCommand()) return;
        
            if (this.commandHolder[interaction.commandName] != null) {
                const name = interaction.commandName
                await this.commandHolder[name].onCommand(name, interaction)
                interaction
            }    
        });

        //Login into the discord client with token
        this.client.login(process.env.BOT_TOKEN)
    }
    async createCommandInteraction(rest: REST) {
        let commands: SlashCommand[] = []
        //List of used commands based on string name
        let usedCommands: string[] = []

        //Loop all plugins which can create commands
        for (let plugin of this.plugins) {
            const pluginCommandList = plugin.createCommandInteraction();

            //Convert the commands of the plugins to json
            for (let pluginCommand of pluginCommandList) {
                //Get the plugin object as JSON to grab said metadata
                const pluginCommandJson = pluginCommand.toJSON();
                //Get the name of the command
                const cmdName = pluginCommandJson.name
                //Get the current name of the constructor of the current plugin
                const pluginName = plugin.constructor.name

                //Check if the commands has already been used
                if (usedCommands.includes(pluginCommandJson.name)) {
                    this.log(`Command conflict with '${pluginCommandJson.name}' for ${pluginName}, currently used by ${this.commandHolder[cmdName]}`)
                    continue;
                }
                //Adding command
                usedCommands.push(cmdName)   
                
                //Check if the plugin has already set commands
                if (this.commandStates[pluginName] == null) { 
                    this.commandStates[pluginName] = {} //If not init the object
                }

                //Always default the command state to true, as the command will always run.
                //TODO: Add DiscordService hook and check if plugin has saved these values and maybe hook after the database loads?
                //Which would allow for command to be disable via plugins if needed. 

                this.commandStates[pluginName][cmdName] = true

                //Keep refernece to has the commands
                this.commandHolder[cmdName] = plugin

                //Add the command (SlashCommandBuilder type) to the list of commands to be registered by Discord
                commands.push(pluginCommand)
            }

        }
        //Convert the list of commands to json 
        const commandsJson = commands.map(command => command.toJSON())

        //console.log({commandsJson})

        //Based on https://dev.to/kunal/how-to-make-a-slash-commands-bot-with-discord-js-v13-3l6k
        if (!process.env.DEV_GUILD) {
            await rest.put(
                Routes.applicationCommands(this.client!.user!.id), {
                    body: commandsJson
                },
            );
            this.log("Successfully registered application commands globally.")
        } else {
            await rest.put(
                Routes.applicationGuildCommands(this.client!.user!.id, process.env.DEV_GUILD), {
                    body: commandsJson
                },
            );
            this.log("Successfully registered application commands for development guild.")
        }
    }

    async hook(plugin: IPlugin<Discord>) {
        //Check if the plugin could create commands
        if(hasMethod(plugin.createCommandInteraction)) {
            this.plugins.push(plugin) //If so add it to a list which can be used later
        }
    }
}