var config = {
  jid: process.env.JID || 'somejid',
  password: process.env.PASSWORD || 'somepassword',
  keepalive_interval: 60 * 1000,
  muc_host: "conf.hipchat.com",
  muc_rooms: ['31008_lounge'],
  muc_nick: 'Praise Bot',
  responds_to: ['praise bot', 'praisebot']
};

module.exports = config;
