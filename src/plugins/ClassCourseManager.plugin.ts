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

import { CacheType, ChatInputCommandInteraction, PermissionsBitField, SlashCommandBuilder, EmbedBuilder, ChannelType, TextChannel } from "discord.js";
import fetchCookie from "fetch-cookie";
import { DataTypes } from "sequelize";
import { Plugin } from "../PluginManager";
import { Database, DatabaseModelList, ICreateModel } from "../services/DatabaseService";
import { Discord, SlashCommand } from "../services/DiscordService";
import { Web, WebRoute } from "../services/WebService";
import nodeFetch from "node-fetch";

import JSSoup from 'jssoup';
import { formatISO9075 } from "date-fns";

function escapeMarkdown(text: string) {
    var unescaped = text.replace(/\\(\*|_|`|~|\\)/g, '$1'); // unescape any "backslashed" character
    var escaped = unescaped.replace(/(\*|_|`|~|\\)/g, '\\$1'); // escape *, _, `, ~, \
    return escaped;
}



export class ClassCourseManager extends Plugin implements Discord, Web, Database {
    models: DatabaseModelList = {}
    name = "Course Manager";
    version = "1.0.0"





    async verifyCourse(interaction: ChatInputCommandInteraction<CacheType>, DEPARTMENT: string, COURSE: string) {
        //we need to verify the channel
        try {
            //Start fetching but with cookies
            const fetch = fetchCookie(nodeFetch)

            //Now fetch the main site for the f@ck!ng awful token that's embedded in the site. 
            //Thankfully JSSoup makes this really easy
            let response = await fetch('https://colss-prod.ec.svsu.edu/Student/courses/')
            let data = await response.text();
            let soup = new JSSoup(data)
            const token = soup.find('body')!.nextElement;
            console.log({ token })
            //https://colss-prod.ec.svsu.edu/Student/courses/
            response = await fetch("https://colss-prod.ec.svsu.edu/Student/Courses/GetCatalogAdvancedSearchAsync", {
                "headers": {
                    "__requestverificationtoken": token!.attrs.value,
                    "accept": "application/json, text/javascript, */*; q=0.01",
                    "accept-language": "en-US,en;q=0.9",
                    "content-type": "application/json, charset=utf-8",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "sec-gpc": "1",
                    "x-requested-with": "XMLHttpRequest",
                    "Referer": "https://colss-prod.ec.svsu.edu/Student/courses/",
                    "Referrer-Policy": "strict-origin-when-cross-origin"
                },
                "body": undefined,
                "method": "GET"
            });

            //Get the response for the current term
            let json = await <any>response.json()
            //22/FA
            //const CURRENT_TERM = json!.Terms[0].Item1 //Get the current term

            //FIX: Not use a environment variable to set term but its for dev rn
            const CURRENT_TERM = process.env.CURRENT_TERM

            response = await fetch("https://colss-prod.ec.svsu.edu/Student/Courses/SearchAsync", {
                "headers": {
                    "__requestverificationtoken": token!.attrs.value,
                    "accept": "application/json, text/javascript, */*; q=0.01",
                    "accept-language": "en-US,en;q=0.9",
                    "content-type": "application/json, charset=UTF-8",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "sec-gpc": "1",
                    "x-requested-with": "XMLHttpRequest",
                    "Referer": "https://colss-prod.ec.svsu.edu/Student/Courses/Search",
                    "Referrer-Policy": "strict-origin-when-cross-origin"
                },
                "body": `{\"searchParameters\":\"{\\\"keyword\\\":null,\\\"terms\\\":[\\\"${CURRENT_TERM}\\\"],\\\"requirement\\\":null,\\\"subrequirement\\\":null,\\\"courseIds\\\":null,\\\"sectionIds\\\":null,\\\"requirementText\\\":null,\\\"subrequirementText\\\":\\\"\\\",\\\"group\\\":null,\\\"startTime\\\":null,\\\"endTime\\\":null,\\\"openSections\\\":null,\\\"subjects\\\":[],\\\"academicLevels\\\":[],\\\"courseLevels\\\":[],\\\"synonyms\\\":[],\\\"courseTypes\\\":[],\\\"topicCodes\\\":[],\\\"days\\\":[],\\\"locations\\\":[],\\\"faculty\\\":[],\\\"onlineCategories\\\":null,\\\"keywordComponents\\\":[{\\\"subject\\\":\\\"${DEPARTMENT}\\\",\\\"courseNumber\\\":\\\"${COURSE}\\\",\\\"section\\\":\\\"\\\",\\\"synonym\\\":\\\"\\\"}],\\\"startDate\\\":null,\\\"endDate\\\":null,\\\"startsAtTime\\\":null,\\\"endsByTime\\\":null,\\\"pageNumber\\\":1,\\\"sortOn\\\":\\\"SectionName\\\",\\\"sortDirection\\\":\\\"Ascending\\\",\\\"subjectsBadge\\\":[],\\\"locationsBadge\\\":[],\\\"termFiltersBadge\\\":[],\\\"daysBadge\\\":[],\\\"facultyBadge\\\":[],\\\"academicLevelsBadge\\\":[],\\\"courseLevelsBadge\\\":[],\\\"courseTypesBadge\\\":[],\\\"topicCodesBadge\\\":[],\\\"onlineCategoriesBadge\\\":[],\\\"openSectionsBadge\\\":\\\"\\\",\\\"openAndWaitlistedSectionsBadge\\\":\\\"\\\",\\\"subRequirementText\\\":null,\\\"quantityPerPage\\\":30,\\\"openAndWaitlistedSections\\\":null,\\\"searchResultsView\\\":\\\"SectionListing\\\"}\"}`,
                "method": "POST"
            });
            //Get the list of sections based on a course with the meetings
            json = await response.json()
            //Do we have a course?
            let hasCourse = false
            let courseId = ""
            //If no sections (empty), well don't even attempt to loop
            if (json.Sections != null) {

                //We have sections, then can we actually loop them?
                for (const section of json.Sections) {
                    console.log(section)
                    //Well if we got here, that means we have at least a course
                    hasCourse = true
                    courseId = section.Course.Id;
                    const title = section.SectionTitleDisplay
                    const sectionNum = section.Number;
                    const name = section.SectionNameDisplay
                    const meetings = section.FormattedMeetingTimes
                    const startDate = section.StartDateDisplay
                    const endDate = section.EndDateDisplay
                    const id = section.Id
                    const faculty = section.InstructorDetails
                    const credits = section.MinimumCredits


                    //Update or insert the course/section
                    await this.models.Courses.upsert({
                        id: id,
                        course: section.Course.Id,
                        term: CURRENT_TERM,
                        section: sectionNum,
                        name: name,
                        title: title,
                        startDate: startDate,
                        endDate: endDate,
                        facultyName: faculty[0].FacultyName,
                        facultyId: faculty[0].FacultyId,
                        credits: credits
                    })

                    //Now look through all of the meetings for said section of the course
                    for (const meeting of meetings) {

                        const startTime = meeting.StartTimeDisplay
                        const endTime = meeting.EndTimeDisplay

                        const startDateMeet = meeting.StartDate != null ? meeting.StartDate.split("(")[1].split(")")[0] : null;
                        const endDateMeet = meeting.EndDate != null ? meeting.EndDate.split("(")[1].split(")")[0] : null

                        const building = meeting.BuildingDisplay
                        const room = meeting.RoomDisplay
                        const days = meeting.DaysOfWeekDisplay

                        const online = meeting.IsOnline

                        const meetingType = meeting.InstructionalMethodDisplay
                        const code = meeting.InstructionalMethodCode

                        const meetingId = `${id}_${code}`

                        //code is the KEY
                        console.log({
                            id: meetingId,
                            code: meetingType,
                            startTime: startTime,
                            endTime: endTime,
                            startDate: startDateMeet,
                            endDate: endDateMeet,
                            days: days,
                            building: building,
                            room: room,
                            online: online,
                            section: id
                        })

                        //Save the meetings in the database if not already exist
                        await this.models.Meetings.upsert({
                            id: meetingId,
                            code: meetingType,
                            startDate: startDateMeet != null ? formatISO9075(new Date(parseInt(startDateMeet, 10))) : null,
                            endDate: endDateMeet != null ? formatISO9075(new Date(parseInt(endDateMeet, 10))) : null,
                            startTime: startTime,
                            endTime: endTime,
                            days: days,
                            building: building,
                            room: room,
                            online: online,
                            section: id
                        })
                    }
                }
                //We don't have a course, well tell the admin who is using this command
                if (hasCourse == false) {
                    await interaction.reply({ content: "No courses found!", ephemeral: true })
                } else {
                    return courseId;
                }
            } else {
                interaction.reply({ content: "Invalid DEPARTMENT or COURSE!", ephemeral: true })
            }
        } catch (exception) {
            console.log(exception)
            await interaction.reply({ content: "An error had occured....", ephemeral: true })
        }
        return null
    }


    async listSections(interaction: ChatInputCommandInteraction<CacheType>, ephemeral: boolean) {
        const count = await this.models.Channels.count({ where: { id: interaction.channelId } })
        if (count > 0) {
            //Find the current channel
            const channel = await this.models.Channels.findOne({ where: { id: interaction.channelId } })
            //Get the course Id 
            const courseId = channel?.getDataValue("courseId")
            //Find all thes sections
            const sections = await this.models.Courses.findAll({ where: { course: courseId } })

            //Do we have a course with that number
            let hasCourse = false

            //List of all embeds
            let embeds: EmbedBuilder[] = []

            //Loop all of the sections
            for (let section of sections) {
                hasCourse = true //Well if we can loop the course sections, it does work!
                const sectionId = section.getDataValue("id")
                const meetings = await this.models.Meetings.findAll({ where: { section: sectionId } })

                const name = section.getDataValue("name")
                const title = section.getDataValue("title")
                const faculty = section.getDataValue("facultyName")

                const embed = new EmbedBuilder()
                    .setTitle(`${escapeMarkdown(name)} - ${title}`)
                    .setTimestamp()
                    .setColor('#00FF00')
                    .setFooter({ text: `${this.name} ${this.version}` })
                embed.addFields({ name: 'Faculty', value: `${faculty}`, inline: true })
                for (let meeting of meetings) {
                    //Get all of the values
                    const code = meeting.getDataValue("code")
                    const startTime = meeting.getDataValue("startTime")
                    const endTime = meeting.getDataValue("endTime")
                    const startDate = meeting.getDataValue("startDate")
                    const endDate = meeting.getDataValue("endDate")
                    const online = meeting.getDataValue("online")
                    const room = meeting.getDataValue("room")
                    const building = meeting.getDataValue("building")
                    const days = meeting.getDataValue("days")

                    //Format the dates with discords time format feature
                    console.log({ startDate, endDate })
                    const startDateFormat = startDate != null ? `<t:${Math.round(startDate.valueOf() / 1000)}:D>` : "Unknown Date"
                    const endDateFormat = endDate != null ? `<t:${Math.round(endDate.valueOf() / 1000)}:D>` : "Unknown Date"

                    //Add the fields
                    embed.addFields({
                        name: code, value: `\n${online == 0 ? `**Location**: ${building} ${room}` : ''}
                    **Days**: ${days}
                    **Start Time**: ${startTime}
                    **End Time**: ${endTime}\n
                    **Online Course**: ${online == 1 ? 'Yes' : 'No'}
                    **Start Date**: ${startDateFormat}
                    **End Date**: ${endDateFormat}`, inline: false
                    })

                }
                embeds.push(embed)
            }
            if (hasCourse) {
                await interaction.reply({ embeds, ephemeral })
            } else {
                interaction.reply({ content: "Could not find the course (" + courseId + ")  for this channel...", ephemeral: true })
            }
        } else {
            await interaction.reply({ content: "This channel is not binded to any course.", ephemeral: true })
        }
    }


    /**
     * bindChannel - Binds a channel to a course (if the course exists)
     * @param interaction 
     */
    async bindChannel(interaction: ChatInputCommandInteraction<CacheType>) {
        const id = interaction.channelId
        const department = interaction.options.getString("department");
        const course = interaction.options.getString("id");
        const courseId = await this.verifyCourse(interaction, department!, course!)
        console.log(courseId)
        if (courseId !== null) {
            const channelId = interaction.channelId
            this.models.Channels.upsert({
                id: channelId,
                courseId: courseId
            })
            const courseName = courseId!.toString().split("_")[0] + " " + courseId!.toString().split("_")[1]
            const embed = new EmbedBuilder()

                .setTitle("Course binded")
                .setDescription("Added course to this channel...")
                .addFields(
                    { name: 'Course', value: courseName }
                )
                .setTimestamp()
                .setColor('#00FF00')
                .setFooter({ text: `Nerdy ${this.version}` })
            await interaction.deferReply()
            await interaction.deleteReply()
            await interaction!.channel!.send({ embeds: [embed] })
        }
    }

    async purgeByCloning(interaction: ChatInputCommandInteraction<CacheType>) {
        const channel = interaction.guild?.channels.cache.get(interaction.channelId) as TextChannel
        const oldChannelId = channel.id
        if(channel!.type === ChannelType.GuildText){
            const newChannel = await channel!.clone()


            //Now check if the old channel had anything related to being binded to a course
            const count = await this.models.Channels.count({where: {id:oldChannelId}})
            if (count > 0) {
                //If so then get the channel database entry
                const channel = await this.models.Channels.findOne({where: {id: oldChannelId}})

                //Get the courseId from the entry
                const courseId = channel?.getDataValue("courseId")
                //Insert a new entry for the new channel based on the oldChannels courseId
                this.models.Channels.upsert({
                    id: newChannel.id,
                    courseId,
                })
            }

            //Delete the channel.
            channel.delete()
        }
       
    }

    async onCommand(name: string, interaction: ChatInputCommandInteraction<CacheType>) {
        if (name === "course") {
            //Maybe check if user has role?
            if (interaction.options.getSubcommand() == "bind") {
                const member = interaction.guild!.members.cache.get(interaction.user.id)
                if (member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    await this.bindChannel(interaction)
                }
            }
            if (interaction.options.getSubcommand() == "purge") {
                const member = interaction.guild!.members.cache.get(interaction.user.id)
                if (member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    await this.purgeByCloning(interaction)
                }
            }
        } else if (name == "sections") {
            await this.listSections(interaction, false)
        }
    }
    
    createCommandInteraction(): SlashCommand[] {
        return [
            new SlashCommandBuilder()
                .setName("course")
                .setDescription("Manage courses in a channel")
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("bind")
                        .setDescription(
                            "Bind the course to this channel."
                        ).addStringOption((option) =>
                            option
                                .setName("department")
                                .setDescription("Deparment for the course.")
                                .setRequired(true)
                        ).addStringOption((option) =>
                            option
                                .setName("id")
                                .setDescription("Course identifier. May include special characters.")
                                .setRequired(true)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("purge")
                        .setDescription(
                            "Purges all messages in the course"
                        )
                ),
            new SlashCommandBuilder()
                .setName("sections")
                .setDescription("List the sections of a course if available.")
        ]
    }

    setupWebRoutes(get: WebRoute, post: WebRoute) {
        get("", async (render, query, body) => {
            
            render("home")
        })
    }
    createModel(createModel: ICreateModel): void {
        this.models.Channels = createModel("channels", {
            id: {
                type: DataTypes.STRING,
                primaryKey: true
            },
            courseId: {
                type: DataTypes.STRING
            }
        })
        this.models.Courses = createModel("courses", {
            id: {
                type: DataTypes.STRING,
                primaryKey: true
            },
            course: {
                type: DataTypes.STRING
            },
            term: {
                type: DataTypes.STRING
            },
            section: {
                type: DataTypes.STRING,
            },
            name: {
                type: DataTypes.STRING
            },
            title: {
                type: DataTypes.STRING
            },
            startDate: {
                type: DataTypes.DATE
            },
            endDate: {
                type: DataTypes.DATE
            },
            facultyName: {
                type: DataTypes.STRING
            },
            facultyId: {
                type: DataTypes.STRING
            },
            credits: {
                type: DataTypes.STRING
            }
        })

        this.models.Meetings = createModel("meetings", {
            id: {
                type: DataTypes.STRING,
                primaryKey: true
            },
            code: {
                type: DataTypes.STRING
            },
            startDate: {
                type: DataTypes.DATE
            },
            endDate: {
                type: DataTypes.DATE
            },
            startTime: {
                type: DataTypes.STRING
            },
            endTime: {
                type: DataTypes.STRING
            },
            days: {
                type: DataTypes.STRING
            },
            building: {
                type: DataTypes.STRING
            },
            room: {
                type: DataTypes.STRING
            },
            online: {
                type: DataTypes.BOOLEAN
            },
            section: {
                type: DataTypes.STRING
            }
        })

        this.models.Channels.sync()
        this.models.Meetings.sync()
        this.models.Courses.sync()
    }
}