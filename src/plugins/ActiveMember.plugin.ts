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

import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { DataTypes, Sequelize } from "sequelize";
import { Plugin } from "../PluginManager";
import { Database, DatabaseModelList, ICreateModel } from "../services/DatabaseService";
import { Discord } from "../services/DiscordService";
import { Web, WebRoute } from "../services/WebService";


export class ActiveMember extends Plugin implements Discord, Web, Database {
    name = "Active Member";
    version = "1.0.0"


    models: DatabaseModelList = {};


    async onCommand(name: string, interaction: ChatInputCommandInteraction<CacheType>) {
        if (name === "ping") {
            await interaction.reply({ content: 'Pong!', ephemeral: true });
        }
    }


    createCommandInteraction(): SlashCommandBuilder[] {
        return [
            new SlashCommandBuilder().setName('ping').setDescription('Replies with pong!'),
            new SlashCommandBuilder().setName('pong').setDescription('Replies with ping!')
        ]
    }


    setupWebRoutes(get: WebRoute, post: WebRoute) {
        get("", async (render, query, body) => {
            /*const user = this.models.User.build({firstName: "Bob", lastName: "Smith"})
            await user.save();            

            const users = await this.models.User.findAll();
            console.log(users)*/
            render("home")
        })
    }
    loadModels(createModel: ICreateModel): void {
        this.models.User = createModel('User', {
            // Model attributes are defined here
            firstName: {
                type: DataTypes.STRING,
                allowNull: false
            },
            lastName: {
                type: DataTypes.STRING
                // allowNull defaults to true
            }
        });
        this.models.User.sync()
    }
}