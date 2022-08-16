import { IPlugin, Service } from "../ServiceManager";
import { hasMethod } from "../helpers/Helpers";

import express from "express"
import cookieParser from "cookie-parser"
import sessions from "express-session"
import bodyParser from "body-parser";

declare module 'express-session' {
    export interface SessionData {
        user: { [key: string]: any };
    }
}

export type WebRoute = (route: string, event: WebEvent) => void
export type WebRender = (view: string) => void
export type WebEvent = (render: WebRender, params: any, body: any) => void

export interface Web {
    setupWebRoutes(get: WebRoute, post: WebRoute): void
}

/**
 * WebService - The web service is used for managing plugins which implement a page to be rendered within (dynamically).
 * The web service is built using simple Bootstrap + HTMX, and the admin login is set in the .env folder (one user only)
 * This web service is only meant to be used by the administrator of the bot. 
 */
export class WebService extends Service<Web>{
    name = "Web";
    version = "1.0.0"
    priority = 0;

    //Create express instance
    app = express()
    //Also get the port form the .env or default to 8080
    port = process.env.WEB_PORT ?? 8080
    //The main routes for ejs
    viewRoutes = ["src/services/views", "src/plugins/views"];


    //Default Icon for the Web Login/Favicon
    defaultIcon = 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Font_Awesome_5_solid_cog.svg';

    //Singleton Instance Declaration 
    static singleton: WebService | null = null;
    static getInstance() {
        if (this.singleton == null) this.singleton = new WebService()
        return this.singleton
    }

    /**
     * start - Service Start 
     */
    async start() {

        //Set the view engine to 'ejs' so we can render dynamic content
        this.app.set("view engine", "ejs");
        //Set the default locations of where said 'ejs' files can be loaded in
        this.app.set("views", this.viewRoutes);

        //Force POST requests to be encoded (thanks Express@4...)
        this.app.use(bodyParser.urlencoded({ extended: false }))

        //Setup sessions so users can login, a cookie can be made and a session can be used
        //to very the user without the need of logging in evertime they refresh the page.
        const oneDay = 1000 * 60 * 60 * 24;
        this.app.use(sessions({
            secret: process.env.WEB_SECRET ?? '12345',
            saveUninitialized: true,
            cookie: { maxAge: oneDay },
            resave: false
        }));

        //Cookies
        this.app.use(cookieParser());


        /**
         * Root Route (main route as HTMX will be used to replace HTML in the application)
         */

        this.app.get("/", (req, res) => {
            const session = req.session

            //Is the user logged in?
            if (session.user) {
                //If so render the home page (dashboard)
                res.render("dashboard", { username: session.user, icon: process.env.WEB_ICON_URL ?? this.defaultIcon, name: process.env.NAME ?? 'Nerdy' })
            } else {
                //If they are not logged in then show them the login screen
                res.render("login", { icon: process.env.WEB_ICON_URL ?? this.defaultIcon, name: process.env.NAME ?? 'Nerdy' })
            }
        })

        this.app.post("/", (req, res) => {
            //By default we assume they can't login
            let error = "Could not login. Please check service logs!"

            //If we have the admin user defaults
            if (process.env.WEB_USERNAME != null && process.env.WEB_PASSWORD) {
                //And the provided password and username are correct
                if (req.body.password == process.env.WEB_PASSWORD && req.body.username == process.env.WEB_USERNAME) {
                    //Then the user can login succesfull!
                    req.session.user = req.body.username
                    //And thus redirected back to the "home" page (basically its just being refreshed)
                    res.redirect("/")
                    return; //And stop excution, we already redirected!
                } else {
                    //Now if they fail to get the correct username/password provide a new error
                    error = "Invalid username/password!"
                }
            } else {
                //Log info for the administractor to update the enviroment variables.
                this.log("No WEB_USERNAME and WEB_PASSWORD setup in the enviroment variables (.env)!")
            }
            //If they couldn't login, well lets send them the login screen again, but with the error!
            res.render("login", { icon: process.env.WEB_ICON_URL ?? this.defaultIcon, name: process.env.NAME ?? 'Nerdy', error })
        })

        this.app.get("/logout", (req, res) => {
            req.session.user = undefined
            res.redirect("/")
        })

        /**
         * Start the main web service with the specified port
         */
        this.app.listen(this.port, () => {
            this.log(`Web Service started at http://localhost:${this.port}`);
        });
    }
    /**
     * Hook - Called when a plugin is hooked into a service
     * @param plugin 
     */
    async hook(plugin: IPlugin<Web>) {
        //Check if said instance of the plugin implements said method
        if (hasMethod(plugin.setupWebRoutes)) {

            //Get route
            const get: WebRoute = (route: string, event: WebEvent) => {

                this.app.get(`/plugins/${plugin.constructor.name}/${route}`, (req, res) => {
                    //provide a render fuction to render the contents of a view relative to the plugins folder
                    const render: WebRender = (view: string) => {
                        res.render(`${plugin.constructor.name}/${view}`)
                    }
                    //Call the event to render said plugin page
                    event(render, req.query, req.body)
                })
            }

            //Provide a function which can be called in the plugin to create post events
            const post: WebRoute = (route: string, event: WebEvent) => {
                this.app.post(`/plugins/${plugin.constructor.name}/${route}`, (req, res) => {
                    const render: WebRender = (view: string) => {
                        this.log("Working?")
                        res.render(`${plugin.constructor.name}/${view}`)
                    }
                    event(render, req.query, req.body)
                })
            }

            //Now call the setupWebRoutes in each plugin
            plugin.setupWebRoutes(get, post)
        }
    }
}