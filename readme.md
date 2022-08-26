# Nerdy

Multi-purpose Discord bot for unqiue guild mangement and features built for the unoffical SVSU Computer Science and Information Systems Discord Server.  

## Plugins 
- [X] Course Channel Management
    - [X] Channel Cloning
    - [X] Room Binding 
- [ ] SVSU Calendar with Notifications
- [ ] Active Member Status 
    

## Structure
The structure of this project is as follows: 

- plugins
- services

The services are components which provide functions to the plugins. This would be Discord API  with `discord.js`, The web backend service using `expressjs`, and the database ORM connection powered by `sequelize`. 


## Developing
1. Clone the repo and move into that directory  
    - `git clone https://github.com/CSISDev/Nerdy`
    - `cd Nerdy`
2. Install the packages using **yarn** only. 
    - `yarn`
3. Build the typescript and run the code for development purpose.
    - `yarn dev`


## Bulding Production
1. Run the buld command
    - `yarn build`
2. Run the bot framework
    - `yarn start`

