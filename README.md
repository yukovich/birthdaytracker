# birthdaytracker
End Result: A birthday reminder service that notifies the user of upcoming birthdays through a Telegram bot. The user enters the contact name and birthday through a web interface.

You will need: a domain name, hosting (I used Digitalocean), and a Telegram bot (https://core.telegram.org/bots).

The system is built on Meteor v1.2.1. Deployment of the code was done using MeteorUp (https://github.com/arunoda/meteor-up)

Before Deployment

1. Set up Meteor.

2. In the birthdaytracker.html file, replace [your_bot_name] with the name of your bot

3. In the birthdaytracker.js file, replace [your_bot_token] with the bot token for your bot. Get this from @botfather.

4. If you've pointed your domain to your host, you should see a web interface at your domain after deployment. Create an account and read the user instructions from the birthdaytracker.html file!
