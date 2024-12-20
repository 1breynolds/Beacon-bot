const fs = require('fs');

module.exports = (client) => {
    const eventFiles = fs.readdirSync('./src/events').filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const event = require(`../events/${file}`);
        const eventName = file.split('.')[0];

        if (event.once) {
            client.once(eventName, (...args) => event.execute(...args));
        } else {
            client.on(eventName, (...args) => event.execute(...args));
        }
    }
};
