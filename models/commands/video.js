const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "mp4",
  version: "4.7.0",
  hasPermssion: 0,
  credits: "Shaan Khan",
  description: "Search 1-10 videos and download (360p+)",
  commandCategory: "Media",
  usages: "[video name]",
  cooldowns: 5,
  dependencies: {
    "axios": "",
    "fs-extra": "",
    "path": "",
    "yt-search": ""
  }
};

const nix = "https://raw.githubusercontent.com/aryannix/stuffs/master/raw/apis.json";

module.exports.run = async function({ api, event, args }) {
  if (this.config.credits !== "Shaan Khan") {
    return api.sendMessage(`❌ [SYSTEM ERROR] : Credit violation detected.`, event.threadID);
  }

  const { threadID, messageID } = event;
  const query = args.join(" ");

  if (!query) return api.sendMessage("❌ Please provide a video name.", threadID, messageID);

  try {
    const yts = require("yt-search");
    const searchResults = await yts(query);
    const videos = searchResults.videos.slice(0, 10);

    if (videos.length === 0) return api.sendMessage("❌ No results found.", threadID, messageID);

    let searchList = "🔍 YouTube Search Results (360p+):\n\n";
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    for (let i = 0; i < videos.length; i++) {
      searchList += `${i + 1}. ${videos[i].title} [${videos[i].timestamp}]\n\n`;
    }

    searchList += `»»𝑶𝑾𝑵𝑬𝑹««★™  »»𝑹𝑼𝑻𝑰𝑲««\n          🥀𝒀𝑬 𝑳𝑶 𝑩𝑨𝑩𝒀 𝑨𝑷𝑲𝑰👉 VIDEO LIST`;

    return api.sendMessage(searchList, threadID, (err, info) => {
      const replyObj = {
        name: this.config.name,
        commandName: this.config.name,
        messageID: info.messageID,
        author: event.senderID,
        videos: videos
      };

      if (global.client && global.client.handleReply) {
        global.client.handleReply.push(replyObj);
      } else if (global.GoatBot && global.GoatBot.onReply) {
        global.GoatBot.onReply.set(info.messageID, replyObj);
      }
    }, messageID);

  } catch (err) {
    return api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};

module.exports.handleReply = async function({ api, event, handleReply }) {
  const { threadID, messageID, body, senderID } = event;
  if (handleReply.author !== senderID) return;

  const choice = parseInt(body);
  if (isNaN(choice) || choice < 1 || choice > handleReply.videos.length) {
    return api.sendMessage("❌ Invalid choice! Choose 1-10.", threadID, messageID);
  }

  const selectedVideo = handleReply.videos[choice - 1];
  if (handleReply.messageID) api.unsendMessage(handleReply.messageID);

  const waitMsg = await api.sendMessage(`✅ Apki Request Jari Hai Please wait...`, threadID);

  try {
    const apiConfig = await axios.get(nix);
    const nixtubeApi = apiConfig.data.nixtube;

    // Yahan resolution 360p set kiya gaya hai
    const res = await axios.get(`${nixtubeApi}?url=${encodeURIComponent(selectedVideo.url)}&type=video&quality=360`);

    const downloadUrl = res.data.downloadUrl || (res.data.data && res.data.data.downloadUrl);
    if (!downloadUrl) throw new Error("Failed to get download link.");

    const cachePath = path.join(__dirname, "cache", `${Date.now()}.mp4`);

    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(cachePath);
    response.data.pipe(writer);

    writer.on('finish', async () => {
      const stats = fs.statSync(cachePath);
      const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      // Limit 100MB
      if (stats.size > 104857600) { 
        fs.unlinkSync(cachePath);
        api.unsendMessage(waitMsg.messageID);
        return api.sendMessage(`⚠️ Size: ${fileSizeInMB}MB (Limit Exceeded).\n\n🔗 Link: ${downloadUrl}`, threadID, messageID);
      }

      const msg = {
        body: `🖤 Title: ${selectedVideo.title}\n📊 Quality: 360p\n📦 Size: ${fileSizeInMB}MB\n\n»»𝑶𝑾𝑵𝑬𝑹««★™  »»𝑹𝑼𝑻𝑰𝑲««\n🥀𝒀𝑬 𝑳𝑶 𝑩𝑨𝑩𝒀 𝑨𝑷𝑲𝑰👉MUSIC-VIDEO`,
        attachment: fs.createReadStream(cachePath)
      };

      return api.sendMessage(msg, threadID, (err) => {
        if (err) {
            api.sendMessage(`❌ Messenger failed to send file. Try link:\n${downloadUrl}`, threadID, messageID);
        }
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
        api.unsendMessage(waitMsg.messageID);
      }, messageID);
    });

  } catch (err) {
    if (waitMsg) api.unsendMessage(waitMsg.messageID);
    return api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};