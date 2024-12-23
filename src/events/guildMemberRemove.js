const { updateServerCountChannel } = require('../handlers/serverCountHandler');

module.exports = {
    name: 'guldMemberRemove',
    async execute(member) {
        // Update channel count
        await updateServerCountChannel(member.guild);
    }
};