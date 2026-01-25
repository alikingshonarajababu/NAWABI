const axios = require("axios");
const yts = require("yt-search");

// 🔐 Credits Lock Check
function checkCredits() {
    const correctCredits = "Shaan Khan"; 
    if (module.exports.config.credits !== correctCredits) {
        throw new Error("❌ Credits Locked By Shaan Khan");
    }
}

const baseApiUrl = async () => {
    const base = await axios.get(`https://raw.githubusercontent.com/Mostakim0978/D1PT0/refs/heads/main/baseApiUrl.json`);
    return base.data.api;
};

(async () => {
    global.apis = {
        diptoApi: await baseApiUrl()
    };
})();

async function getStreamFromURL(url, pathName) {
    const response = await axios.get(url, { responseType: "stream" });
    response.data.path = pathName;
    return response.data;
}

function getVideoID(url) {
    const regex = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))((\w|-){11})(?:\S+)?$/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

module.exports.config = {
    name: "music", 
    version: "1.2.1",
    credits: "Shaan Khan", // 🔐 Locked
    hasPermssion: 0,
    cooldowns: 5,
    description: "YouTube official audio downloader",
    commandCategory: "media",
    usages: "[Song name or URL]"
};

module.exports.run = async function({ api, args, event }) {
    try {
        checkCredits(); 

        let videoID, searchMsg, title;
        const url = args[0];

        if (url && (url.includes("youtube.com") || url.includes("youtu.be"))) {
            videoID = getVideoID(url);
            if (!videoID) {
                return api.sendMessage("❌ Galat YouTube URL!", event.threadID, event.messageID);
            }
        } else {
            const query = args.join(" ");
            if (!query) return api.sendMessage("❌ Song ka naam likho!", event.threadID, event.messageID);

            // Updated Searching Message as per request
            searchMsg = await api.sendMessage(`✅ Apki Request Jari Hai Please wait....`, event.threadID);
            
            const result = await yts(query);
            if (!result.videos.length) {
                if (searchMsg?.messageID) api.unsendMessage(searchMsg.messageID);
                return api.sendMessage("❌ Kuch nahi mila!", event.threadID, event.messageID);
            }
            
            // Top/Official result selection
            const selected = result.videos[0]; 
            videoID = selected.videoId;
            title = selected.title;
        }

        const res = await axios.get(`${global.apis.diptoApi}/ytDl3?link=${videoID}&format=mp3`);
        const downloadLink = res.data.data.downloadLink;
        const finalTitle = res.data.data.title || title || "audio";

        if (searchMsg?.messageID) api.unsendMessage(searchMsg.messageID);

        const shortLink = (await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(downloadLink)}`)).data;

        return api.sendMessage({
            body: `🎵 Title: ${finalTitle}\n📥 Download: ${shortLink}`,
            attachment: await getStreamFromURL(downloadLink, `${finalTitle}.mp3`)
        }, event.threadID, event.messageID);

    } catch (err) {
        console.error(err);
        return api.sendMessage("⚠️ Error: " + (err.message || "Problem in downloading!"), event.threadID, event.messageID);
    }
};
